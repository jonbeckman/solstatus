import { WorkerEntrypoint } from "cloudflare:workers"
import { takeFirstOrNull, useDrizzle } from "@solstatus/common/db"
import { EndpointMonitorsTable, UptimeChecksTable } from "@solstatus/common/db/schema"
import { endpointSignature } from "@solstatus/common/utils"
import { eq } from "drizzle-orm"
import { ReasonPhrases, StatusCodes } from "http-status-codes"
import type { MonitorExecEnv } from "../infra/types/env"
import { handleFailureTracking, sendAlert } from "./utils/error-tracking"

export default class MonitorExec extends WorkerEntrypoint<MonitorExecEnv> {
  // export default class MonitorExec extends WorkerEntrypoint {
  async fetch(_request: Request) {
    //Use service or RPC binding to work with the Monitor Durable Object
    return new Response(
      `${ReasonPhrases.OK}\nMonitorExec: Use service or RPC binding to work with the Monitor Durable Object`,
      { status: StatusCodes.OK },
    )
  }

  //waitUntil is used to avoid immediately return a response so that the durable object is not charged for wall time
  async executeCheck(endpointMonitorId: string) {
    this.ctx.waitUntil(this._executeCheck(endpointMonitorId))
  }

  private async _executeCheck(endpointMonitorId: string) {
    const db = useDrizzle(this.env.DB)
    const endpointMonitor = await db
      .select()
      .from(EndpointMonitorsTable)
      .where(eq(EndpointMonitorsTable.id, endpointMonitorId))
      .then(takeFirstOrNull)

    if (!endpointMonitor) {
      console.error(
        `EndpointMonitor [${endpointMonitorId}] does not exist. Deleting Durable Object...`,
      )
      //TODO: This causes a cyclic dependency, so we cannot delete the DO here.
      // await this.env.MONITOR_TRIGGER_RPC.deleteDo(endpointMonitorId)

      return
    }

    console.log(`${endpointSignature(endpointMonitor)}: performing check...`)
    let isExpectedStatus = false
    let responseTime = 0
    let status = 0
    let errorMessage = ""
    const startTime = Date.now()

    try {
      const response = await fetch(endpointMonitor.url, {
        method: "GET",
        redirect: "follow",
        cf: {
          cacheTTL: 0,
          cacheEverything: false,
        },
      })

      responseTime = Date.now() - startTime
      status = response.status
      await response.body?.cancel()
      // Use expectedStatusCode if provided, otherwise default to 2xx/3xx
      isExpectedStatus =
        endpointMonitor.expectedStatusCode != null
          ? response.status === endpointMonitor.expectedStatusCode
          : response.status >= 200 && response.status < 400
      console.log(
        `${endpointSignature(endpointMonitor)}: check complete. Status: ${status}, Response Time: ${responseTime}ms, ExpectedStatus: ${isExpectedStatus}`,
      )
    } catch (error) {
      responseTime = Date.now() - startTime
      isExpectedStatus = false
      errorMessage = error instanceof Error ? error.message : String(error)
      console.error("Error performing check:", errorMessage)
    }

    // Store check result
    try {
      await db.insert(UptimeChecksTable).values({
        endpointMonitorId: endpointMonitor.id,
        timestamp: new Date(),
        status,
        responseTime,
        isExpectedStatus,
      })
    } catch (error) {
      console.error("Error storing check result: ", error)
    }

    await handleFailureTracking(
      isExpectedStatus,
      status,
      errorMessage,
      endpointMonitor,
      db,
      this.env,
    )
  }

  async testSendAlert(endpointMonitorId: string, status: number, errorMessage: string) {
    console.log(this.env.APP_ENV)
    const db = useDrizzle(this.env.DB)

    const endpointMonitor = await db
      .select()
      .from(EndpointMonitorsTable)
      .where(eq(EndpointMonitorsTable.id, endpointMonitorId))
      .then(takeFirstOrNull)
    if (!endpointMonitor) {
      throw new Error(`EndpointMonitor [${endpointMonitorId}] does not exist`)
    }

    await sendAlert(status, errorMessage, endpointMonitor, this.env)
  }
}
