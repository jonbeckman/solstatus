import { msToHumanReadable, secsToHumanReadable } from "@solstatus/common/utils"
import { IconPointFilled } from "@tabler/icons-react"
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router"
import { ArrowLeft } from "lucide-react"
import * as Schema from "effect/Schema"
import { startTransition, useDeferredValue, useEffect, useMemo, useState } from "react"
import { PolkaDots } from "@/components/bg-patterns/polka-dots"
import { EndpointMonitorDetailHeader } from "@/components/endpoint-monitor-detail-header"
import { EndpointMonitorSectionCards } from "@/components/endpoint-monitor-section-cards"
import LatencyRangeChart from "@/components/latency-range-chart"
import { TimeRangeTabs } from "@/components/time-range-tabs"
import { UptimeChart } from "@/components/uptime-chart"
import { defaultHeaderContent, useHeaderContentOnly } from "@/context/header-context"
import { useAutoRefresh } from "@/hooks/use-auto-refresh"
import {
  refreshEndpointMonitors,
  useEndpointMonitor,
  useLatestCheck,
  useUptimeRange,
} from "@/lib/api-queries"
import { cn } from "@/lib/utils"
import { Badge } from "@/registry/new-york-v4/ui/badge"
import { Button } from "@/registry/new-york-v4/ui/button"
import { Card, CardContent } from "@/registry/new-york-v4/ui/card"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/registry/new-york-v4/ui/tooltip"
import { TimeRange, type UptimeCheck } from "@/server/api/schemas"

// Helper function to calculate default time range based on monitor age
const noChecks: readonly UptimeCheck[] = []

function calculateDefaultTimeRange(createdAt: Date): TimeRange {
  const now = new Date()
  const ageInMs = now.getTime() - createdAt.getTime()
  const ageInMinutes = ageInMs / (1000 * 60)
  const ageInHours = ageInMinutes / 60
  const ageInDays = ageInHours / 24

  if (ageInMinutes < 30) {
    return "30m"
  }

  if (ageInHours < 1) {
    return "1h"
  }

  if (ageInHours < 3) {
    return "3h"
  }

  if (ageInHours < 6) {
    return "6h"
  }

  if (ageInDays < 1) {
    return "1d"
  }

  // Max out at 2d for monitors older than 2 days
  return "2d"
}

const DetailSearch = Schema.Struct({
  range: Schema.optionalKey(TimeRange),
})

export const Route = createFileRoute("/endpoint-monitors/$id")({
  validateSearch: Schema.toStandardSchemaV1(DetailSearch),
  component: EndpointMonitorDetailPage,
})

function EndpointMonitorDetailPage() {
  const { id: endpointMonitorId } = Route.useParams()
  const navigate = useNavigate()
  const { setHeaderLeftContent, setHeaderRightContent } = useHeaderContentOnly()
  const { range: rangeInUrl } = Route.useSearch()

  const monitorQuery = useEndpointMonitor(endpointMonitorId)
  const endpointMonitor = monitorQuery.data ?? null
  const latestUptimeCheck = useLatestCheck(endpointMonitorId).data ?? null

  // Without a range in the URL, a young monitor opens on a range that its checks fill.
  const timeRange: TimeRange =
    rangeInUrl ?? (endpointMonitor ? calculateDefaultTimeRange(endpointMonitor.createdAt) : "1d")

  const uptimeQuery = useUptimeRange(endpointMonitorId, timeRange)
  const uptimeData = uptimeQuery.data ?? noChecks
  const isUptimeDataLoading = uptimeQuery.isFetching
  const uptimeDataError = uptimeQuery.isError ? "Failed to load uptime data." : null
  const hasLoadedDataOnce = uptimeQuery.isFetched
  const [isTransitioning, setIsTransitioning] = useState(false)

  // Defer chart data updates to prevent blocking tab animations
  const deferredUptimeData = useDeferredValue(uptimeData)
  const deferredTimeRange = useDeferredValue(timeRange)
  const deferredIsTransitioning = useDeferredValue(isTransitioning)

  const isNotFound = monitorQuery.data === null

  useEffect(() => {
    if (isNotFound) {
      void navigate({ href: "/" })
    }
  }, [isNotFound, navigate])

  useAutoRefresh({
    onRefresh: refreshEndpointMonitors,
    enabled: !!endpointMonitorId,
  })

  useEffect(() => {
    // The useAutoRefresh hook now handles the initial data fetch.
    return () => {
      setHeaderLeftContent(null)
      setHeaderRightContent(defaultHeaderContent)
    }
  }, [setHeaderLeftContent, setHeaderRightContent])

  useEffect(() => {
    if (endpointMonitor) {
      setHeaderLeftContent(endpointMonitor.name)
      setHeaderRightContent(
        endpointMonitor.isRunning ? (
          <div className="flex items-center gap-2">
            {latestUptimeCheck && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <p className="text-sm text-muted-foreground underline decoration-dashed cursor-help">
                      {`Checking every ${secsToHumanReadable(endpointMonitor.checkInterval)}`}
                    </p>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Latest check:</p>
                    <p>
                      {new Date(latestUptimeCheck.timestamp).toLocaleString(undefined, {
                        year: "numeric",
                        month: "numeric",
                        day: "numeric",
                        hour: "numeric",
                        minute: "numeric",
                        second: "numeric",
                        timeZoneName: "short",
                      })}
                    </p>
                    <p>Status: {latestUptimeCheck.status}</p>
                    <p>Latency: {msToHumanReadable(latestUptimeCheck.responseTime ?? 0, true)}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}

            {!latestUptimeCheck && (
              <p className="text-sm text-muted-foreground">
                {`Checking every ${secsToHumanReadable(endpointMonitor.checkInterval)}`}
              </p>
            )}

            <div className="relative">
              <IconPointFilled className="absolute text-green-500 animate-ping" />
              <IconPointFilled className="relative z-10 mr-1 text-green-500" />
            </div>
          </div>
        ) : (
          <Badge variant="warning" className="animate-pulse">
            Paused
          </Badge>
        ),
      )
    }
  }, [endpointMonitor, latestUptimeCheck, setHeaderLeftContent, setHeaderRightContent])

  const uptimePercentage = useMemo(
    () =>
      uptimeData.length > 0
        ? (uptimeData.filter((check) => check.isExpectedStatus).length / uptimeData.length) * 100
        : null,
    [uptimeData],
  )

  const avgLatency = useMemo(
    () =>
      uptimeData.length > 0
        ? uptimeData.reduce((sum, check) => sum + (check.responseTime ?? 0), 0) / uptimeData.length
        : null,
    [uptimeData],
  )

  if (monitorQuery.isPending) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="h-[400px] flex items-center justify-center">
          <p className="text-muted-foreground">Loading endpoint Monitor details...</p>
        </div>
      </div>
    )
  }

  if (!endpointMonitor) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="flex items-center mb-6">
          <Button variant="ghost" size="sm" asChild className="mr-4">
            <Link to="/">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Link>
          </Button>
        </div>
        <div className="h-[400px] flex items-center justify-center">
          <p className="text-muted-foreground">Endpoint Monitor not found</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto pt-2 pb-8 px-4">
      <div className="@container/main flex flex-1 flex-col gap-2">
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6 px-4 lg:px-6">
          <EndpointMonitorDetailHeader endpointMonitor={endpointMonitor} />

          <TimeRangeTabs
            value={timeRange}
            onValueChange={(value) => {
              const newTimeRange = value

              // Mark as transitioning immediately
              setIsTransitioning(true)

              // Delay the state update to allow tab animation to complete
              requestAnimationFrame(() => {
                startTransition(() => {
                  void navigate({
                    to: "/endpoint-monitors/$id",
                    params: { id: endpointMonitorId },
                    search: { range: newTimeRange },
                  })

                  // Clear transitioning state after a delay
                  setTimeout(() => {
                    setIsTransitioning(false)
                  }, 300) // Match tab animation duration
                })
              })
            }}
          />

          <EndpointMonitorSectionCards
            endpointMonitor={endpointMonitor}
            avgResponseTime={avgLatency ?? 0}
            uptimePercentage={uptimePercentage ?? 0}
            loading={isUptimeDataLoading}
            error={uptimeDataError}
          />
          <div className="mt-0 flex flex-col gap-6">
            {deferredUptimeData.length > 0 || (isUptimeDataLoading && hasLoadedDataOnce) ? (
              <>
                <Card
                  className={cn(
                    "p-0 transition-opacity duration-300",
                    deferredIsTransitioning && "opacity-50",
                  )}
                >
                  <CardContent className="p-0">
                    <div className="h-[200px]">
                      <UptimeChart
                        data={deferredUptimeData}
                        timeRange={deferredTimeRange}
                        isLoading={isUptimeDataLoading || deferredIsTransitioning}
                        error={uptimeDataError}
                      />
                    </div>
                  </CardContent>
                </Card>
                <Card
                  className={cn(
                    "transition-opacity duration-300",
                    deferredIsTransitioning && "opacity-50",
                  )}
                >
                  <CardContent className="pt-6">
                    <div className="h-[400px]">
                      <LatencyRangeChart
                        data={deferredUptimeData}
                        timeRange={deferredTimeRange}
                        isLoading={isUptimeDataLoading || deferredIsTransitioning}
                        error={uptimeDataError}
                      />
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              <div className="flex items-center justify-center h-full relative overflow-hidden rounded-lg bg-muted/50">
                <PolkaDots />
                <div className="relative text-muted-foreground z-10 p-8">
                  {isUptimeDataLoading
                    ? "Loading uptime data..."
                    : "No uptime data available for the selected period."}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
