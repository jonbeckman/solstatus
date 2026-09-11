import { getWorkerEnv } from "@/lib/worker-env"
import type { uptimeChecksSelectSchema } from "@solstatus/common/db"
import { useDrizzle } from "@solstatus/common/db"
import { UptimeChecksTable } from "@solstatus/common/db/schema"
import { subDays, subHours, subMinutes, subWeeks } from "date-fns"
import { and, eq, gt } from "drizzle-orm"
import { StatusCodes } from "http-status-codes"
import { z } from "zod"
import { createRoute } from "@/lib/api-utils"
import { idStringParamsSchema } from "@/lib/route-schemas"

const querySchema = z.object({
  range: z.enum(["30m", "1h", "3h", "6h", "1d", "2d", "7d"]).default("1h"),
})

/**
 * GET /api/endpoint-monitors/[id]/uptime/range
 *
 * Retrieves uptime data for a specific endpointMonitor within a given time range.
 *
 * @params {string} id - EndpointMonitor ID
 * @query {string} range - Time range ('30m', '1h', '3h', '6h', '1d', '2d', '7d', default: '1h')
 * @returns {Promise<Response>} JSON response with uptime data
 * @throws {Response} 500 Internal Server Error on database errors
 */
export const GET = createRoute
  .params(idStringParamsSchema)
  .query(querySchema)
  .handler(async (_request, context) => {
    const { env } = getWorkerEnv()
    const db = useDrizzle(env.DB)
    const { id: endpointMonitorId } = context.params
    const { range } = context.query

    const now = new Date()
    let startTime: Date
    switch (range) {
      case "30m":
        startTime = subMinutes(now, 30)
        break
      case "1h":
        startTime = subHours(now, 1)
        break
      case "3h":
        startTime = subHours(now, 3)
        break
      case "6h":
        startTime = subHours(now, 6)
        break
      case "1d":
        startTime = subDays(now, 1)
        break
      case "2d":
        startTime = subDays(now, 2)
        break
      case "7d":
        startTime = subWeeks(now, 1)
        break
      default:
        startTime = subHours(now, 1)
        break
    }

    try {
      const results: z.infer<typeof uptimeChecksSelectSchema>[] = await db
        .select()
        .from(UptimeChecksTable)
        .where(
          and(
            eq(UptimeChecksTable.endpointMonitorId, endpointMonitorId),
            gt(UptimeChecksTable.timestamp, startTime),
          ),
        )
        .orderBy(UptimeChecksTable.timestamp)

      console.log(
        `Uptime checks in range [${range}] for endpointMonitor [${endpointMonitorId}]: ${results.length}`,
      )
      return Response.json(results, { status: StatusCodes.OK })
    } catch (error) {
      console.error("Error fetching uptime data: ", error)
      return Response.json(
        { error: "Failed to fetch uptime data" },
        { status: StatusCodes.INTERNAL_SERVER_ERROR },
      )
    }
  })
