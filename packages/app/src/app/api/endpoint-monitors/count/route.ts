import { getWorkerEnv } from "@/lib/worker-env"
import { takeUniqueOrThrow, useDrizzle } from "@solstatus/common/db"
import { EndpointMonitorsTable } from "@solstatus/common/db/schema"
import { and, count, eq, like, sql } from "drizzle-orm"
import { NextResponse } from "@/lib/http"
import { z } from "zod"
import { createRoute } from "@/lib/api-utils"

const querySchema = z.object({
  search: z.string().optional(),
  isRunning: z.string().optional(),
  checkIntervalMin: z.number().optional(),
  checkIntervalMax: z.number().optional(),
})

export const GET = createRoute.query(querySchema).handler(async (_request, context) => {
  const { env } = getWorkerEnv()
  const db = useDrizzle(env.DB)

  const { search, isRunning, checkIntervalMin, checkIntervalMax } = context.query

  const { count: totalCount } = await db
    .select({ count: count() })
    .from(EndpointMonitorsTable)
    .where(
      and(
        search
          ? sql`(${like(EndpointMonitorsTable.name, `%${search}%`)} OR ${like(EndpointMonitorsTable.url, `%${search}%`)})`
          : sql`1=1`,
        isRunning !== undefined
          ? eq(EndpointMonitorsTable.isRunning, isRunning === "true")
          : sql`1=1`,
        checkIntervalMin !== undefined
          ? sql`${EndpointMonitorsTable.checkInterval} >= ${checkIntervalMin}`
          : sql`1=1`,
        checkIntervalMax !== undefined
          ? sql`${EndpointMonitorsTable.checkInterval} <= ${checkIntervalMax}`
          : sql`1=1`,
      ),
    )
    .then(takeUniqueOrThrow)

  return NextResponse.json(totalCount)
})
