import { getWorkerEnv } from "@/lib/worker-env"
import { takeFirstOrNull, takeUniqueOrThrow, useDrizzle } from "@solstatus/common/db"
import { EndpointMonitorsTable, UptimeChecksTable } from "@solstatus/common/db/schema"
import { and, count, desc, eq, gt, isNotNull } from "drizzle-orm"
import { StatusCodes } from "http-status-codes"
import { NextResponse } from "@/lib/http"
import { createRoute } from "@/lib/api-utils"

export const GET = createRoute.handler(async (_request, _context) => {
  const { env } = getWorkerEnv()
  const db = useDrizzle(env.DB)

  try {
    // Get total endpointMonitor count
    const { totalEndpointMonitors } = await db
      .select({
        totalEndpointMonitors: count(),
      })
      .from(EndpointMonitorsTable)
      .then(takeUniqueOrThrow)

    // Get count of endpointMonitors with active alerts
    const { sitesWithAlerts } = await db
      .select({
        sitesWithAlerts: count(),
      })
      .from(EndpointMonitorsTable)
      .where(eq(EndpointMonitorsTable.activeAlert, true))
      .then(takeUniqueOrThrow)

    // Get highest response time and associated endpointMonitor ID in the last 24 hours
    const oneDayAgo = new Date()
    oneDayAgo.setDate(oneDayAgo.getDate() - 1)

    const highestCheck = await db
      .select({
        highestResponseTime: UptimeChecksTable.responseTime,
        highestResponseTimeEndpointMonitorId: UptimeChecksTable.endpointMonitorId,
      })
      .from(UptimeChecksTable)
      .where(
        and(gt(UptimeChecksTable.timestamp, oneDayAgo), isNotNull(UptimeChecksTable.responseTime)),
      )
      .orderBy(desc(UptimeChecksTable.responseTime))
      .limit(1)
      .then(takeFirstOrNull)

    // Get overall uptime percentage in the last 24 hours
    const checksResult = await db
      .select({
        isExpectedStatus: UptimeChecksTable.isExpectedStatus,
      })
      .from(UptimeChecksTable)
      .where(gt(UptimeChecksTable.timestamp, oneDayAgo))

    const totalChecks = checksResult.length
    const successfulChecks = checksResult.filter((check) => check.isExpectedStatus).length

    const uptimePercentage = totalChecks > 0 ? (successfulChecks / totalChecks) * 100 : 100

    return NextResponse.json(
      {
        totalEndpointMonitors,
        sitesWithAlerts,
        highestResponseTime: highestCheck?.highestResponseTime ?? 0,
        highestResponseTimeEndpointMonitorId:
          highestCheck?.highestResponseTimeEndpointMonitorId ?? null,
        uptimePercentage: Math.round(uptimePercentage * 100) / 100,
      },
      {
        status: StatusCodes.OK,
      },
    )
  } catch (error) {
    console.error("Error fetching dashboard statistics: ", error)
    return NextResponse.json(
      { error: "Failed to fetch dashboard statistics" },
      { status: StatusCodes.INTERNAL_SERVER_ERROR },
    )
  }
})
