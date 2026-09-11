import { getWorkerEnv } from "@/lib/worker-env"
import { takeUniqueOrThrow, useDrizzle } from "@solstatus/common/db"
import { EndpointMonitorsTable } from "@solstatus/common/db/schema"
import { eq } from "drizzle-orm"
import { StatusCodes } from "http-status-codes"
import { createRoute } from "@/lib/api-utils"
import { idStringParamsSchema } from "@/lib/route-schemas"

/**
 * GET /api/endpoint-monitors/[id]/execute-check
 *
 * Manually executes an uptime check for a specific endpointMonitor.
 *
 * @params {string} id - Endpoint Monitor ID
 * @returns {Promise<Response>} JSON response confirming the check execution
 */
export const GET = createRoute.params(idStringParamsSchema).handler(async (_request, context) => {
  const { env } = getWorkerEnv()
  const db = useDrizzle(env.DB)

  const endpointMonitor = await db
    .select()
    .from(EndpointMonitorsTable)
    .where(eq(EndpointMonitorsTable.id, context.params.id))
    .then(takeUniqueOrThrow)

  await env.MONITOR_EXEC.executeCheck(endpointMonitor.id)

  return Response.json({ message: "Executed check via DO" }, { status: StatusCodes.OK })
})
