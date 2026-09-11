import { getWorkerEnv } from "@/lib/worker-env"
import type { InitPayload } from "@solstatus/api/monitor-trigger"
import {
  endpointMonitorsInsertDTOSchema,
  type endpointMonitorsSelectSchema,
  takeUniqueOrThrow,
  useDrizzle,
} from "@solstatus/common/db"
import { EndpointMonitorsTable } from "@solstatus/common/db/schema"
import { createId, PRE_ID } from "@solstatus/common/utils"
import { and, asc, count, desc, eq, like, sql } from "drizzle-orm"
import type { SQLiteColumn } from "drizzle-orm/sqlite-core"
import { StatusCodes } from "http-status-codes"
import { NextResponse } from "@/lib/http"
import { z } from "zod"
import { createRoute } from "@/lib/api-utils"
import { paginationQuerySchema } from "@/lib/route-schemas"
import type { ConflictEndpointMonitorResponse } from "@/types/endpointMonitor"

const extendedQuerySchema = paginationQuerySchema().extend({
  search: z.string().optional(),
  isRunning: z.string().optional(),
  checkIntervalMin: z.number().optional(),
  checkIntervalMax: z.number().optional(),
})

export const GET = createRoute.query(extendedQuerySchema).handler(async (_request, context) => {
  const { env } = getWorkerEnv()
  const db = useDrizzle(env.DB)

  const {
    pageSize,
    page,
    orderBy: orderByParam,
    order: orderParam,
    search,
    isRunning,
    checkIntervalMin,
    checkIntervalMax,
  } = context.query

  // Set default sorting if not provided
  const orderBy = orderByParam ?? "consecutiveFailures"
  const order = orderParam ?? "desc"

  console.log(pageSize, page, orderBy, order, search, isRunning, checkIntervalMin, checkIntervalMax)

  const orderByCol = getColumn(orderBy)
  const orderDir = getOrderDirection(order as "asc" | "desc")

  // Create the where conditions first so we can reuse them for both queries
  const whereConditions = and(
    search
      ? sql`(${like(EndpointMonitorsTable.name, `%${search}%`)} OR ${like(EndpointMonitorsTable.url, `%${search}%`)})`
      : sql`1=1`,
    isRunning !== undefined ? eq(EndpointMonitorsTable.isRunning, isRunning === "true") : sql`1=1`,
    checkIntervalMin !== undefined
      ? sql`${EndpointMonitorsTable.checkInterval} >= ${checkIntervalMin}`
      : sql`1=1`,
    checkIntervalMax !== undefined
      ? sql`${EndpointMonitorsTable.checkInterval} <= ${checkIntervalMax}`
      : sql`1=1`,
  )

  // Get paginated endpointMonitors
  const endpointMonitors = await db
    .select()
    .from(EndpointMonitorsTable)
    .where(whereConditions)
    .orderBy(orderDir(orderByCol), asc(EndpointMonitorsTable.id))
    .limit(pageSize)
    .offset(page * pageSize)

  // Get total count with the same filters
  const { count: totalCount } = await db
    .select({ count: count() })
    .from(EndpointMonitorsTable)
    .where(whereConditions)
    .then(takeUniqueOrThrow)

  // Return endpointMonitors and total count
  return NextResponse.json({
    data: endpointMonitors,
    totalCount,
  })
})

export const POST = createRoute
  .body(endpointMonitorsInsertDTOSchema)
  .handler(async (_request, context) => {
    const endpointMonitor: z.infer<typeof endpointMonitorsInsertDTOSchema> = context.body

    const { env } = getWorkerEnv()
    const db = useDrizzle(env.DB)

    // Normalize the URL to remove the protocol
    const normalizedUrl = endpointMonitor.url.replace(/(^\w+:|^)\/\//, "")
    const existingEndpointMonitors: z.infer<typeof endpointMonitorsSelectSchema>[] = await db
      .select()
      .from(EndpointMonitorsTable)
      .where(sql.raw(`instr(url, '${normalizedUrl}') > 0`))

    const matchingWebsite = existingEndpointMonitors.find((endpointMonitor) => {
      const websiteUrl = endpointMonitor.url.replace(/(^\w+:|^)\/\//, "")
      return websiteUrl.endsWith(normalizedUrl) || normalizedUrl.endsWith(websiteUrl)
    })

    if (matchingWebsite) {
      console.log(
        `A URL like [${normalizedUrl}] already exists. Original: [${endpointMonitor.url}], Found: [${matchingWebsite.url}]`,
      )
      return NextResponse.json(
        {
          message: `A monitor with a similar URL already exists. ${JSON.stringify({
            provided: endpointMonitor.url,
            searched: normalizedUrl,
            found: matchingWebsite.url,
          })}`,
          matchingEndpointMonitor: matchingWebsite,
        } as const satisfies ConflictEndpointMonitorResponse,
        {
          status: StatusCodes.CONFLICT,
        },
      )
    }

    // TODO: Use a transaction to ensure atomicity between inserting and scheduling
    const newWebsite = await db
      .insert(EndpointMonitorsTable)
      .values({
        ...endpointMonitor,
        id: createId(PRE_ID.endpointMonitor),
      })
      .returning()
      .then(takeUniqueOrThrow)

    // Create monitor DO
    await env.MONITOR_TRIGGER_RPC.init({
      monitorId: newWebsite.id,
      monitorType: "endpoint",
      checkInterval: newWebsite.checkInterval,
    } as InitPayload)

    return NextResponse.json(newWebsite, { status: 201 })
  })

function getOrderDirection(direction: "asc" | "desc") {
  return direction === "desc" ? desc : asc
}

function getColumn(columnName: string): SQLiteColumn {
  return EndpointMonitorsTable[columnName as keyof typeof EndpointMonitorsTable] as SQLiteColumn
}
