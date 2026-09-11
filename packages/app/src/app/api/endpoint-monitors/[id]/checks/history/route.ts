import { getWorkerEnv } from "@/lib/worker-env"
import { useDrizzle } from "@solstatus/common/db"
import { UptimeChecksTable } from "@solstatus/common/db/schema"
import { and, desc, eq, sql } from "drizzle-orm"
import { StatusCodes } from "http-status-codes"
import { NextResponse } from "@/lib/http"
import { createRoute } from "@/lib/api-utils"
import { daysQuerySchema, idStringParamsSchema } from "@/lib/route-schemas"

export const GET = createRoute
  .params(idStringParamsSchema)
  .query(daysQuerySchema())
  .handler(async (_request, context) => {
    const { env } = getWorkerEnv()
    const db = useDrizzle(env.DB)

    const { days } = context.query

    try {
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - days)

      const results = await db
        .select()
        .from(UptimeChecksTable)
        .where(
          and(
            eq(UptimeChecksTable.endpointMonitorId, context.params.id),
            sql`${UptimeChecksTable.timestamp} >= ${startDate.toISOString()}`,
          ),
        )
        .orderBy(desc(UptimeChecksTable.timestamp))

      return NextResponse.json(results, { status: StatusCodes.OK })
    } catch (error) {
      console.error("Error fetching uptime checks history: ", error)
      return NextResponse.json(
        { error: "Failed to fetch uptime checks history" },
        { status: StatusCodes.INTERNAL_SERVER_ERROR },
      )
    }
  })
