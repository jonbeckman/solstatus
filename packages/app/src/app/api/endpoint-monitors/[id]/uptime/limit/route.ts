import { getWorkerEnv } from "@/lib/worker-env"
import type { uptimeChecksSelectSchema } from "@solstatus/common/db"
import { useDrizzle } from "@solstatus/common/db"
import { UptimeChecksTable } from "@solstatus/common/db/schema"
import { and, desc, eq, isNotNull } from "drizzle-orm"
import { StatusCodes } from "http-status-codes"
import { z } from "zod"
import { createRoute } from "@/lib/api-utils"
import { idStringParamsSchema } from "@/lib/route-schemas"

const querySchema = z.object({
  limit: z.coerce.number().optional().default(30),
})

/**
 * GET /api/endpoint-monitors/[id]/uptime/limit
 *
 * Retrieves uptime limit data for a specific endpointMonitor.
 *
 * @params {string} id - EndpointMonitor ID
 * @query {number} limit - Maximum number of data points to return (default: 30)
 * @returns {Promise<Response>} JSON response with uptime limit data in chronological order
 * @throws {Response} 500 Internal Server Error on database errors
 */
export const GET = createRoute
  .params(idStringParamsSchema)
  .query(querySchema)
  .handler(async (_request, context) => {
    const { env } = getWorkerEnv()
    const db = useDrizzle(env.DB)
    const { id: endpointMonitorId } = context.params
    const { limit } = context.query

    try {
      const results: z.infer<typeof uptimeChecksSelectSchema>[] = await db
        .select()
        .from(UptimeChecksTable)
        .where(
          and(
            eq(UptimeChecksTable.endpointMonitorId, endpointMonitorId),
            isNotNull(UptimeChecksTable.responseTime),
          ),
        )
        // order by timestamp descending to get the most recent first
        .orderBy(desc(UptimeChecksTable.timestamp))
        .limit(limit)
        // reverse the results put it back in chronological order
        .then((results) => results.reverse())

      return Response.json(results, { status: StatusCodes.OK })
    } catch (error) {
      console.error("Error fetching latency data: ", error)
      return Response.json(
        { error: "Failed to fetch latency data" },
        { status: StatusCodes.INTERNAL_SERVER_ERROR },
      )
    }
  })
