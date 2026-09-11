import { getWorkerEnv } from "@/lib/worker-env"
import { StatusCodes } from "http-status-codes"
import { createRoute } from "@/lib/api-utils"
import { idStringParamsSchema } from "@/lib/route-schemas"

/**
 * POST /api/endpoint-monitors/[id]/pause
 *
 * Pauses monitoring for a specific endpointMonitor.
 *
 * @params {string} id - Endpoint Monitor ID
 * @returns {Promise<Response>} JSON response confirming the monitoring has been paused
 */
export const POST = createRoute.params(idStringParamsSchema).handler(async (_request, context) => {
  const { env } = getWorkerEnv()
  await env.MONITOR_TRIGGER_RPC.pauseDo(context.params.id)

  return Response.json({ message: "Paused Monitor DO" }, { status: StatusCodes.OK })
})
