import { getWorkerEnv } from "@/lib/worker-env"
import type { uptimeChecksSelectSchema } from "@solstatus/common/db"
import { takeUniqueOrThrow, useDrizzle } from "@solstatus/common/db"
import { UptimeChecksTable } from "@solstatus/common/db/schema"
import { desc, eq } from "drizzle-orm"
import { StatusCodes } from "http-status-codes"
import type { z } from "zod"
import { createRoute } from "@/lib/api-utils"
import { idStringParamsSchema } from "@/lib/route-schemas"

/**
 * GET /api/endpoint-monitors/[id]/uptime
 *
 * Get the latest uptime check for a endpointMonitor
 *
 * @params {string} id - EndpointMonitor ID
 * @returns {Promise<Response>} JSON response with uptime percentage and period
 * @throws {Response} 404 Not Found if no uptime checks found for the endpointMonitor
 * @throws {Response} 500 Internal Server Error on database errors
 */
export const GET = createRoute.params(idStringParamsSchema).handler(async (_request, context) => {
  const { env } = getWorkerEnv()
  const db = useDrizzle(env.DB)
  const { id: endpointMonitorId } = context.params

  try {
    const result: z.infer<typeof uptimeChecksSelectSchema> = await db
      .select()
      .from(UptimeChecksTable)
      .where(eq(UptimeChecksTable.endpointMonitorId, endpointMonitorId))
      .orderBy(desc(UptimeChecksTable.timestamp))
      .limit(1)
      .then(takeUniqueOrThrow)

    return Response.json(result, { status: StatusCodes.OK })
  } catch (error) {
    console.error(
      `Error getting latest uptime check for endpointMonitor [${endpointMonitorId}]: ${error}`,
    )
    return Response.json(
      { error: "Failed to get latest uptime check" },
      { status: StatusCodes.INTERNAL_SERVER_ERROR },
    )
  }
})
