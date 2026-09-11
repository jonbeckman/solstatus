import { getWorkerEnv } from "@/lib/worker-env"
import { useDrizzle } from "@solstatus/common/db"
import { UptimeChecksTable } from "@solstatus/common/db/schema"
import { and, desc, eq, gt } from "drizzle-orm"
import { StatusCodes } from "http-status-codes"
import { NextResponse } from "@/lib/http"
import { createRoute } from "@/lib/api-utils"
import { idStringParamsSchema, timeRangeQuerySchema } from "@/lib/route-schemas"
import { getTimeRangeInMinutes } from "@/lib/uptime-utils"
import type { TimeRange } from "@/types/endpointMonitor"

export const GET = createRoute
  .params(idStringParamsSchema)
  .query(timeRangeQuerySchema)
  .handler(async (_request, context) => {
    const { env } = getWorkerEnv()
    const db = useDrizzle(env.DB)
    const { timeRange } = context.query

    try {
      // Calculate start time based on time range
      const startTime = new Date()
      startTime.setMinutes(startTime.getMinutes() - getTimeRangeInMinutes(timeRange as TimeRange))

      const results = await db
        .select()
        .from(UptimeChecksTable)
        .where(
          and(
            eq(UptimeChecksTable.endpointMonitorId, context.params.id),
            gt(UptimeChecksTable.timestamp, startTime),
          ),
        )
        .orderBy(desc(UptimeChecksTable.timestamp))

      return NextResponse.json(results, { status: StatusCodes.OK })
    } catch (error) {
      console.error("Error fetching uptime checks: ", error)
      return NextResponse.json(
        { error: "Failed to fetch uptime checks" },
        { status: StatusCodes.INTERNAL_SERVER_ERROR },
      )
    }
  })
