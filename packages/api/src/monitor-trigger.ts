import { DurableObject, WorkerEntrypoint } from "cloudflare:workers"
import { takeUniqueOrThrow, useDrizzle } from "@solstatus/common/db"
import { EndpointMonitorsTable } from "@solstatus/common/db/schema"
import { endpointSignature, MonitorTriggerNotInitializedError } from "@solstatus/common/utils"
import { state } from "diffable-objects"
import { eq } from "drizzle-orm"
import { ReasonPhrases, StatusCodes } from "http-status-codes"
import type { MonitorTriggerEnv } from "../infra/types/env"

type MonitorType = "endpoint" | "synthetic"
type Runtime = "playwright-cf-latest" | "puppeteer-cf-latest"

interface MonitorState {
  monitorId: string | null
  monitorType: MonitorType | null
  checkInterval: number | null
  timeoutSeconds?: number | null
  runtime?: Runtime | null
}

export interface InitPayload {
  monitorId: string
  monitorType: MonitorType
  checkInterval: number
  timeoutSeconds?: number
  runtime?: Runtime
}

/**
 * Durable Object that triggers checks for both Endpoint Monitors and Synthetic Monitors.
 */
export class MonitorTrigger extends DurableObject<MonitorTriggerEnv> {
  #state = state<MonitorState>(this.ctx, "state", {
    monitorId: null,
    monitorType: null,
    checkInterval: null,
    timeoutSeconds: null,
    runtime: null,
  })

  // Updated init method
  async init(payload: InitPayload) {
    console.log(
      `Initializing Monitor Trigger DO for [${payload.monitorId}] (${payload.monitorType})`,
    )

    // Validate payload based on type
    if (payload.monitorType === "synthetic" && (!payload.timeoutSeconds || !payload.runtime)) {
      throw new Error("Synthetic monitors require timeoutSeconds and runtime during init.")
    }

    // Initialize state
    this.#state.monitorId = payload.monitorId
    this.#state.monitorType = payload.monitorType
    this.#state.checkInterval = payload.checkInterval
    let timeoutSeconds: number | undefined
    let runtime: Runtime | undefined
    if (payload.monitorType === "synthetic") {
      this.#state.timeoutSeconds = payload.timeoutSeconds
      this.#state.runtime = payload.runtime
      // Assign to local vars after setting state
      timeoutSeconds = this.#state.timeoutSeconds
      runtime = this.#state.runtime
    }

    // Trigger the first check immediately
    await this.triggerCheck(
      this.#state.monitorId as string,
      this.#state.monitorType as MonitorType,
      this.#state.checkInterval as number,
      timeoutSeconds,
      runtime,
    )
  }

  // Updated getters
  private async getMonitorId(): Promise<string> {
    const monitorId = this.#state.monitorId
    if (!monitorId) {
      throw new MonitorTriggerNotInitializedError("Monitor ID not set.")
    }
    return monitorId
  }

  private async getMonitorType(): Promise<MonitorType> {
    const monitorType = this.#state.monitorType
    if (!monitorType) {
      throw new MonitorTriggerNotInitializedError("Monitor type not set.")
    }
    return monitorType
  }

  private async getCheckInterval(): Promise<number> {
    const checkInterval = this.#state.checkInterval
    if (!checkInterval) {
      throw new MonitorTriggerNotInitializedError("Check interval not set.")
    }
    return checkInterval
  }

  private async getTimeoutSeconds(): Promise<number> {
    // Should only be called for synthetic type
    const timeoutSeconds = this.#state.timeoutSeconds
    if (this.#state.monitorType !== "synthetic" || !timeoutSeconds) {
      throw new MonitorTriggerNotInitializedError("Timeout not set or not applicable.")
    }
    return timeoutSeconds
  }

  private async getRuntime(): Promise<Runtime> {
    // Should only be called for synthetic type
    const runtime = this.#state.runtime
    if (this.#state.monitorType !== "synthetic" || !runtime) {
      throw new MonitorTriggerNotInitializedError("Runtime not set or not applicable.")
    }
    return runtime
  }

  // Updated alarm method
  async alarm(alarmInfo?: { retryCount: number; isRetry: boolean }) {
    const monitorId = await this.getMonitorId()
    const monitorType = await this.getMonitorType()
    const checkInterval = await this.getCheckInterval()

    // Log if this is a retry
    if (alarmInfo?.isRetry) {
      console.log(
        `Received an alarm retry #${alarmInfo.retryCount} for [${monitorId}]. Not retrying.`,
      )
      await this.ctx.storage.setAlarm(Date.now() + checkInterval * 1000)
      return
    }

    // Fetch type-specific state if needed
    let timeoutSeconds: number | undefined
    let runtime: Runtime | undefined
    if (monitorType === "synthetic") {
      timeoutSeconds = await this.getTimeoutSeconds()
      runtime = await this.getRuntime()
    }

    await this.triggerCheck(monitorId, monitorType, checkInterval, timeoutSeconds, runtime)
  }

  // Updated triggerCheck method
  private async triggerCheck(
    monitorId: string,
    monitorType: MonitorType,
    checkInterval: number,
    timeoutSeconds?: number,
    runtime?: Runtime,
  ) {
    console.log(`Triggering ${monitorType} check for [${monitorId}]`)

    try {
      if (monitorType === "synthetic") {
        console.error(
          `Synthetic monitors are not supported yet (timeoutSeconds: ${timeoutSeconds}, runtime: ${runtime}) Skipping check.`,
        )
      } else {
        // Delegate endpoint check
        await this.env.MONITOR_EXEC.executeCheck(monitorId)
      }
    } catch (error) {
      console.error(`Failed to delegate check for [${monitorId}]:`, error)
      // Optional: Implement retry logic or error handling here
      // Reschedule anyway to prevent checks from stopping completely
    }

    // Schedule the next check regardless of delegation outcome
    await this.ctx.storage.setAlarm(Date.now() + checkInterval * 1000)
    console.log(`Scheduled next check for [${monitorId}] in ${checkInterval} seconds`)
  }

  // updateCheckInterval might need to become updateConfig for synthetics
  async updateCheckInterval(checkInterval: number) {
    const monitorId = await this.getMonitorId()
    console.log(`Updating check interval for [${monitorId}] to [${checkInterval}]`)

    this.#state.checkInterval = checkInterval
    // Reschedule alarm immediately with new interval
    await this.ctx.storage.setAlarm(Date.now() + checkInterval * 1000)

    console.log(`Updated check interval for [${monitorId}] to [${checkInterval}]`)
  }

  // Updated pause method (basic type handling)
  async pause() {
    const monitorId = await this.getMonitorId()
    const monitorType = await this.getMonitorType() // Fetch type to update correct table
    console.log(`Pausing MonitorTrigger DO for [${monitorId}] (${monitorType})`)

    await this.ctx.storage.deleteAlarm()

    const db = useDrizzle(this.env.DB)
    try {
      if (monitorType === "synthetic") {
        console.error("Synthetic monitors are not supported yet. Skipping pause.")
      } else {
        const endpointMonitor = await db
          .update(EndpointMonitorsTable)
          .set({ isRunning: false })
          .where(eq(EndpointMonitorsTable.id, monitorId))
          .returning()
          .then(takeUniqueOrThrow)
        console.log(`Paused Endpoint Monitor ${endpointSignature(endpointMonitor)} in DB`)
      }
    } catch (error) {
      console.error(`Error updating monitor status to paused in DB for [${monitorId}]:`, error)
      // Continue pausing the DO alarm even if DB update fails
    }
  }

  // Updated resume method (basic type handling)
  async resume() {
    const monitorId = await this.getMonitorId()
    const monitorType = await this.getMonitorType()
    const checkInterval = await this.getCheckInterval()
    console.log(
      `Resuming MonitorTrigger DO for [${monitorId}] (${monitorType}) with interval [${checkInterval}]`,
    )

    await this.ctx.storage.setAlarm(Date.now() + checkInterval * 1000)

    const db = useDrizzle(this.env.DB)
    try {
      if (monitorType === "synthetic") {
        console.error("Synthetic monitors are not supported yet. Skipping resume.")
      } else {
        const endpointMonitor = await db
          .update(EndpointMonitorsTable)
          .set({ isRunning: true })
          .where(eq(EndpointMonitorsTable.id, monitorId))
          .returning()
          .then(takeUniqueOrThrow)
        console.log(`Resumed Endpoint Monitor ${endpointSignature(endpointMonitor)} in DB`)
      }
    } catch (error) {
      console.error(`Error updating monitor status to resumed in DB for [${monitorId}]:`, error)
      // Continue resuming the DO alarm even if DB update fails
    }
  }

  // Updated delete method
  async delete() {
    const monitorId = this.#state.monitorId // Use state directly if possible, otherwise fetch
    console.log(`Deleting MonitorTrigger DO for [${monitorId}]`)
    await this.ctx.storage.deleteAlarm()
    await this.ctx.storage.deleteAll() // Deletes all state associated with this DO ID
    console.log(`Deleted MonitorTrigger DO state for [${monitorId}]`)
  }
}

export default class MonitorTriggerRPC extends WorkerEntrypoint<MonitorTriggerEnv> {
  async fetch(_request: Request) {
    //Use service or RPC binding to work with the Monitor Durable Object
    return new Response(
      `${ReasonPhrases.OK}\nMonitorTriggerRPC: Use service or RPC binding to work with the Monitor Durable Object`,
      { status: StatusCodes.OK },
    )
  }

  //////////////////////////////////////////////////////////////////////
  // Monitor DO RPC methods
  //////////////////////////////////////////////////////////////////////

  private getTriggerStub(monitorId: string): DurableObjectStub<MonitorTrigger> {
    const id = this.env.MONITOR_TRIGGER.idFromName(monitorId)
    return this.env.MONITOR_TRIGGER.get(id) as DurableObjectStub<MonitorTrigger>
  }

  // Updated init RPC method
  async init(payload: InitPayload) {
    await this.getTriggerStub(payload.monitorId).init(payload)
  }

  // Updated updateCheckInterval RPC method
  async updateCheckInterval(monitorId: string, checkInterval: number) {
    // TODO: If updating more config for synthetics, this needs a new payload
    await this.getTriggerStub(monitorId).updateCheckInterval(checkInterval)
  }

  // Updated pauseDo RPC method
  async pauseDo(monitorId: string) {
    await this.getTriggerStub(monitorId).pause()
  }

  // Updated resumeDo RPC method
  async resumeDo(monitorId: string) {
    await this.getTriggerStub(monitorId).resume()
  }

  // Updated deleteDo RPC method
  async deleteDo(monitorId: string) {
    await this.getTriggerStub(monitorId).delete()
  }
}
