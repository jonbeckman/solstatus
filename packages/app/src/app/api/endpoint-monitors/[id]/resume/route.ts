import { getWorkerEnv } from "@/lib/worker-env"
import type { InitPayload } from "@solstatus/api/monitor-trigger"
import { takeUniqueOrThrow, useDrizzle } from "@solstatus/common/db"
import { EndpointMonitorsTable } from "@solstatus/common/db/schema"
import { getErrorMessage, MonitorTriggerNotInitializedError } from "@solstatus/common/utils"
import { eq } from "drizzle-orm"
import { StatusCodes } from "http-status-codes"
import { createRoute } from "@/lib/api-utils"
import { idStringParamsSchema } from "@/lib/route-schemas"

/**
 * POST /api/endpoint-monitors/[id]/resume
 *
 * Resumes monitoring for a specific endpointMonitor.
 *
 * @params {string} id - Endpoint Monitor ID
 * @returns {Promise<Response>} JSON response confirming the monitoring has been resumed
 */
export const POST = createRoute.params(idStringParamsSchema).handler(async (_request, context) => {
  const { env } = getWorkerEnv()
  const db = useDrizzle(env.DB)
  const endpointMonitor = await db
    .select()
    .from(EndpointMonitorsTable)
    .where(eq(EndpointMonitorsTable.id, context.params.id))
    .then(takeUniqueOrThrow)

  try {
    await env.MONITOR_TRIGGER_RPC.updateCheckInterval(
      endpointMonitor.id,
      endpointMonitor.checkInterval,
    )
    await env.MONITOR_TRIGGER_RPC.resumeDo(endpointMonitor.id)
  } catch (error) {
    const errorMessage = getErrorMessage(error)

    // RPC returns a wrapped, stringified error, so we need to check for the error name
    if (errorMessage.includes(MonitorTriggerNotInitializedError.NAME)) {
      console.log(`DO [${endpointMonitor.id}] not initialized. Initializing automatically...`)
      await env.MONITOR_TRIGGER_RPC.init({
        monitorId: endpointMonitor.id,
        monitorType: "endpoint",
        checkInterval: endpointMonitor.checkInterval,
      } as InitPayload)
    } else {
      throw error
    }
  }

  return Response.json({ message: "Resumed Monitor DO" }, { status: StatusCodes.OK })
})
