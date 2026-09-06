import { DurableObject, WorkerEntrypoint } from "cloudflare:workers"
import { takeUniqueOrThrow, useDrizzle } from "@solstatus/common/db"
import { EndpointMonitorsTable } from "@solstatus/common/db/schema"
import { endpointSignature, MonitorTriggerNotInitializedError } from "@solstatus/common/utils"
import { state } from "diffable-objects"
import { eq } from "drizzle-orm"
import { ReasonPhrases, StatusCodes } from "http-status-codes"
import type { MonitorTriggerEnv } from "../infra/types/env"

type MonitorType = "endpoint"

interface MonitorState {
  monitorId: string | null
  monitorType: MonitorType | null
  checkInterval: number | null
}

export interface InitPayload {
  monitorId: string
  monitorType: MonitorType
  checkInterval: number
}

/**
 * Durable Object that triggers checks for Endpoint Monitors.
 */
export class MonitorTrigger extends DurableObject<MonitorTriggerEnv> {
  #state = state<MonitorState>(this.ctx, "state", {
    monitorId: null,
    monitorType: null,
    checkInterval: null,
  })

  async init(payload: InitPayload) {
    console.log(
      `Initializing Monitor Trigger DO for [${payload.monitorId}] (${payload.monitorType})`,
    )

    this.#state.monitorId = payload.monitorId
    this.#state.monitorType = payload.monitorType
    this.#state.checkInterval = payload.checkInterval

    await this.triggerCheck(
      this.#state.monitorId as string,
      this.#state.monitorType as MonitorType,
      this.#state.checkInterval as number,
    )
  }

  private getMonitorId(): string {
    const monitorId = this.#state.monitorId
    if (!monitorId) {
      throw new MonitorTriggerNotInitializedError("Monitor ID not set.")
    }
    return monitorId
  }

  private getMonitorType(): MonitorType {
    const monitorType = this.#state.monitorType
    if (!monitorType) {
      throw new MonitorTriggerNotInitializedError("Monitor type not set.")
    }
    return monitorType
  }

  private getCheckInterval(): number {
    const checkInterval = this.#state.checkInterval
    if (!checkInterval) {
      throw new MonitorTriggerNotInitializedError("Check interval not set.")
    }
    return checkInterval
  }

  async alarm(alarmInfo?: { retryCount: number; isRetry: boolean }) {
    const monitorId = this.getMonitorId()
    const monitorType = this.getMonitorType()
    const checkInterval = this.getCheckInterval()

    if (alarmInfo?.isRetry) {
      console.log(
        `Received an alarm retry #${alarmInfo.retryCount} for [${monitorId}]. Not retrying.`,
      )
      await this.ctx.storage.setAlarm(Date.now() + checkInterval * 1000)
      return
    }

    await this.triggerCheck(monitorId, monitorType, checkInterval)
  }

  private async triggerCheck(monitorId: string, monitorType: MonitorType, checkInterval: number) {
    console.log(`Triggering ${monitorType} check for [${monitorId}]`)

    try {
      await this.env.MONITOR_EXEC.executeCheck(monitorId)
    } catch (error) {
      console.error(`Failed to delegate check for [${monitorId}]:`, error)
    }

    // Schedule the next check regardless of delegation outcome
    await this.ctx.storage.setAlarm(Date.now() + checkInterval * 1000)
    console.log(`Scheduled next check for [${monitorId}] in ${checkInterval} seconds`)
  }

  async updateCheckInterval(checkInterval: number) {
    const monitorId = this.getMonitorId()
    console.log(`Updating check interval for [${monitorId}] to [${checkInterval}]`)

    this.#state.checkInterval = checkInterval
    // Reschedule alarm immediately with new interval
    await this.ctx.storage.setAlarm(Date.now() + checkInterval * 1000)

    console.log(`Updated check interval for [${monitorId}] to [${checkInterval}]`)
  }

  async pause() {
    const monitorId = this.getMonitorId()
    const monitorType = this.getMonitorType()
    console.log(`Pausing MonitorTrigger DO for [${monitorId}] (${monitorType})`)

    await this.ctx.storage.deleteAlarm()

    const db = useDrizzle(this.env.DB)
    try {
      const endpointMonitor = await db
        .update(EndpointMonitorsTable)
        .set({ isRunning: false })
        .where(eq(EndpointMonitorsTable.id, monitorId))
        .returning()
        .then(takeUniqueOrThrow)
      console.log(`Paused Endpoint Monitor ${endpointSignature(endpointMonitor)} in DB`)
    } catch (error) {
      console.error(`Error updating monitor status to paused in DB for [${monitorId}]:`, error)
    }
  }

  async resume() {
    const monitorId = this.getMonitorId()
    const monitorType = this.getMonitorType()
    const checkInterval = this.getCheckInterval()
    console.log(
      `Resuming MonitorTrigger DO for [${monitorId}] (${monitorType}) with interval [${checkInterval}]`,
    )

    await this.ctx.storage.setAlarm(Date.now() + checkInterval * 1000)

    const db = useDrizzle(this.env.DB)
    try {
      const endpointMonitor = await db
        .update(EndpointMonitorsTable)
        .set({ isRunning: true })
        .where(eq(EndpointMonitorsTable.id, monitorId))
        .returning()
        .then(takeUniqueOrThrow)
      console.log(`Resumed Endpoint Monitor ${endpointSignature(endpointMonitor)} in DB`)
    } catch (error) {
      console.error(`Error updating monitor status to resumed in DB for [${monitorId}]:`, error)
    }
  }

  async delete() {
    const monitorId = this.#state.monitorId
    console.log(`Deleting MonitorTrigger DO for [${monitorId}]`)
    await this.ctx.storage.deleteAlarm()
    await this.ctx.storage.deleteAll()
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

  async init(payload: InitPayload) {
    await this.getTriggerStub(payload.monitorId).init(payload)
  }

  async updateCheckInterval(monitorId: string, checkInterval: number) {
    await this.getTriggerStub(monitorId).updateCheckInterval(checkInterval)
  }

  async pauseDo(monitorId: string) {
    await this.getTriggerStub(monitorId).pause()
  }

  async resumeDo(monitorId: string) {
    await this.getTriggerStub(monitorId).resume()
  }

  async deleteDo(monitorId: string) {
    await this.getTriggerStub(monitorId).delete()
  }
}
