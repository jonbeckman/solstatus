import type {
  endpointMonitorsPatchSchema,
  endpointMonitorsSelectSchema,
} from "@solstatus/common/db"
import { EndpointMonitorsTable } from "@solstatus/common/db/schema"
import { endpointSignature } from "@solstatus/common/utils"
import { eq } from "drizzle-orm"
import type { DrizzleD1Database } from "drizzle-orm/d1"
import type { z } from "zod"
import type { MonitorExecEnv } from "../../infra/types/env"
import { createEndpointMonitorDownAlert } from "./opsgenie"

export async function handleFailureTracking(
  isExpectedStatus: boolean,
  status: number,
  errorMessage: string,
  endpointMonitor: z.infer<typeof endpointMonitorsSelectSchema>,
  db: DrizzleD1Database,
  env: MonitorExecEnv,
) {
  if (isExpectedStatus) {
    // Reset consecutive failures if the check passes
    if (endpointMonitor.consecutiveFailures > 0) {
      await db
        .update(EndpointMonitorsTable)
        .set({ consecutiveFailures: 0 })
        .where(eq(EndpointMonitorsTable.id, endpointMonitor.id))
    }
  } else {
    const consecutiveFailures = endpointMonitor.consecutiveFailures + 1
    console.log(
      `${endpointSignature(endpointMonitor)} has ${consecutiveFailures} consecutive failures`,
    )

    const endpointMonitorPatch: z.infer<typeof endpointMonitorsPatchSchema> = {
      consecutiveFailures: consecutiveFailures,
    }

    if (consecutiveFailures >= endpointMonitor.alertThreshold && !endpointMonitor.activeAlert) {
      await sendAlert(status, errorMessage, endpointMonitor, env)
      endpointMonitorPatch.activeAlert = true
    }

    await db
      .update(EndpointMonitorsTable)
      .set(endpointMonitorPatch)
      .where(eq(EndpointMonitorsTable.id, endpointMonitor.id))
  }
}

export async function sendAlert(
  status: number,
  errorMessage: string,
  endpointMonitor: z.infer<typeof endpointMonitorsSelectSchema>,
  env: MonitorExecEnv,
) {
  if (!env.OPSGENIE_API_KEY) {
    console.error("OPSGENIE_API_KEY is not set, cannot send alert")
    return
  }

  console.log(
    `${endpointSignature(endpointMonitor)}: consecutive failures threshold (${endpointMonitor.alertThreshold}) reached, sending alert...`,
  )

  const infraMetadata = {
    cloudflareAccountId: env.CLOUDFLARE_ACCOUNT_ID,
    monitorExecName: env.MONITOR_EXEC_NAME,
    monitorTriggerName: env.MONITOR_TRIGGER_NAME,
  }

  try {
    const result = await createEndpointMonitorDownAlert(
      env.OPSGENIE_API_KEY,
      endpointMonitor,
      infraMetadata,
      status,
      errorMessage,
    )

    if (result) {
      console.log(
        `${endpointSignature(endpointMonitor)}: alert sent successfully. RequestId: ${result.requestId}`,
      )
    } else {
      console.error(`${endpointSignature(endpointMonitor)}: failed to send alert`)
    }
  } catch (error) {
    console.error(`${endpointSignature(endpointMonitor)}: error sending alert.`, error)
  }
}
