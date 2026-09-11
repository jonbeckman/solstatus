import type { endpointMonitorsSelectSchema, uptimeChecksSelectSchema } from "@solstatus/common/db"
import { msToHumanReadable, secsToHumanReadable } from "@solstatus/common/utils"
import { IconPointFilled } from "@tabler/icons-react"
import { createFileRoute, Link, useLocation, useNavigate } from "@tanstack/react-router"
import { ArrowLeft } from "lucide-react"
import { startTransition, useCallback, useDeferredValue, useEffect, useRef, useState } from "react"
import type { z } from "zod"
import { PolkaDots } from "@/components/bg-patterns/polka-dots"
import { EndpointMonitorDetailHeader } from "@/components/endpoint-monitor-detail-header"
import { EndpointMonitorSectionCards } from "@/components/endpoint-monitor-section-cards"
import LatencyRangeChart from "@/components/latency-range-chart"
import { TimeRangeTabs } from "@/components/time-range-tabs"
import { UptimeChart } from "@/components/uptime-chart"
import { defaultHeaderContent, useHeaderContentOnly } from "@/context/header-context"
import { useAutoRefresh } from "@/hooks/use-auto-refresh"
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
import { useDialogStore } from "@/store/dialog-store"
import type { TimeRange } from "@/types/endpointMonitor"

// Define the type for a single uptime check
type LatestUptimeCheck = z.infer<typeof uptimeChecksSelectSchema>

// Helper function to calculate default time range based on monitor age
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

export const Route = createFileRoute("/endpoint-monitors/$id")({
  component: EndpointMonitorDetailPage,
})

function EndpointMonitorDetailPage() {
  const { id: endpointMonitorId } = Route.useParams()
  const navigate = useNavigate()
  const { setHeaderLeftContent, setHeaderRightContent } = useHeaderContentOnly()
  const searchStr = useLocation({ select: (location) => location.searchStr })
  const searchParams = new URLSearchParams(
    searchStr.startsWith("?") ? searchStr.slice(1) : searchStr,
  )
  const { isEditEndpointMonitorDialogOpen } = useDialogStore()

  const [endpointMonitor, setEndpointMonitor] = useState<z.infer<
    typeof endpointMonitorsSelectSchema
  > | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Initialize timeRange with a temporary default
  const [timeRange, setTimeRange] = useState<TimeRange>(() => {
    const rangeParam = searchParams.get("range")
    const validRanges = ["30m", "1h", "3h", "6h", "1d", "2d", "7d"] as const
    return validRanges.includes(rangeParam as TimeRange) ? (rangeParam as TimeRange) : "1d" // Temporary default until we load the monitor
  })

  // Track if we've set the default based on monitor age
  const hasSetDefaultTimeRange = useRef(false)

  const [uptimeData, setUptimeData] = useState<z.infer<typeof uptimeChecksSelectSchema>[]>([])
  const [latestUptimeCheck, setLatestUptimeCheck] = useState<LatestUptimeCheck | null>(null) // New state for latest check

  const [uptimePercentage, setUptimePercentage] = useState<number | null>(null)
  const [avgLatency, setAvgLatency] = useState<number | null>(null)
  const [isUptimeDataLoading, setIsUptimeDataLoading] = useState(true)
  const [uptimeDataError, setUptimeDataError] = useState<string | null>(null)
  const isInitialRender = useRef(true)
  const hasLoadedDataOnce = useRef(false)
  const [isTransitioning, setIsTransitioning] = useState(false)

  // Defer chart data updates to prevent blocking tab animations
  const deferredUptimeData = useDeferredValue(uptimeData)
  const deferredTimeRange = useDeferredValue(timeRange)
  const deferredIsTransitioning = useDeferredValue(isTransitioning)

  const fetchWebsite = useCallback(async () => {
    try {
      const response = await fetch(`/api/endpoint-monitors/${endpointMonitorId}`)
      if (!response.ok) {
        if (response.status === 404) {
          void navigate({ href: "/" })
          return
        }
        throw new Error(`Failed to fetch endpointMonitor: ${response.statusText}`)
      }
      const data = await response.json()
      const monitor = data as z.infer<typeof endpointMonitorsSelectSchema>
      setEndpointMonitor(monitor)

      // Set default time range based on monitor age if URL doesn't have a range
      if (!searchParams.get("range") && !hasSetDefaultTimeRange.current && monitor.createdAt) {
        hasSetDefaultTimeRange.current = true
        const defaultRange = calculateDefaultTimeRange(new Date(monitor.createdAt))
        setTimeRange(defaultRange)
      }
    } catch (error) {
      console.error("Error fetching endpointMonitor:", error)
    } finally {
      setIsLoading(false)
    }
  }, [endpointMonitorId, navigate, searchParams])

  const fetchUptimeData = useCallback(async () => {
    if (!endpointMonitorId) {
      return
    }

    // Check if we have existing data before starting the fetch
    const hasExistingData = uptimeData.length > 0

    setIsUptimeDataLoading(true)
    setUptimeDataError(null)

    try {
      const response = await fetch(
        `/api/endpoint-monitors/${endpointMonitorId}/uptime/range?range=${timeRange}`,
      )
      if (!response.ok) {
        console.error(
          `Failed to fetch combined data for endpointMonitor ${endpointMonitorId} with error: ${response.statusText}`,
        )
        // Don't clear existing data on error during refresh
        if (!hasExistingData) {
          setUptimeData([])
          setUptimePercentage(null)
          setAvgLatency(null)
        }
        setUptimeDataError(`Failed to load data: ${response.statusText}`)
        return
      }

      const responseData = (await response.json()) as z.infer<typeof uptimeChecksSelectSchema>[]

      setUptimeData(responseData)
      setUptimeDataError(null)
      hasLoadedDataOnce.current = true
    } catch (error) {
      console.error("Error fetching combined uptime/latency data:", error)
      // Don't clear existing data on error during refresh
      if (!hasExistingData) {
        setUptimeData([])
      }
      setUptimeDataError("An error occurred while loading endpointMonitor data.")
    } finally {
      setIsUptimeDataLoading(false)
    }
  }, [endpointMonitorId, timeRange, uptimeData.length])

  const fetchLatestUptimeCheck = useCallback(async () => {
    if (!endpointMonitorId) {
      return
    }

    try {
      const response = await fetch(`/api/endpoint-monitors/${endpointMonitorId}/uptime`)
      if (!response.ok) {
        if (response.status !== 404) {
          console.error(`Failed to fetch latest uptime check: ${response.statusText}`)
        }
        setLatestUptimeCheck(null)
        return
      }
      const data = await response.json()
      setLatestUptimeCheck(data as LatestUptimeCheck)
    } catch (error) {
      console.error("Error fetching latest uptime check:", error)
      setLatestUptimeCheck(null)
    }
  }, [endpointMonitorId])

  // Create a ref to hold the latest fetchUptimeData function.
  // This allows refreshAllData to remain stable while still calling the latest fetchUptimeData.
  const fetchUptimeDataRef = useRef(fetchUptimeData)
  useEffect(() => {
    fetchUptimeDataRef.current = fetchUptimeData
  }, [fetchUptimeData])

  const refreshAllData = useCallback(async () => {
    if (endpointMonitorId) {
      await Promise.all([fetchWebsite(), fetchUptimeDataRef.current(), fetchLatestUptimeCheck()])
    }
  }, [endpointMonitorId, fetchWebsite, fetchLatestUptimeCheck])

  useAutoRefresh({
    onRefresh: refreshAllData,
    enabled: !!endpointMonitorId && !isEditEndpointMonitorDialogOpen,
  })

  // This effect is now responsible for fetching uptime data when the timeRange changes.
  // It skips the initial render because useAutoRefresh handles the initial data load.
  useEffect(() => {
    if (isInitialRender.current) {
      isInitialRender.current = false
      return
    }
    fetchUptimeData()
  }, [fetchUptimeData])

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
                    {/* <span className="underline decoration-dashed cursor-help">
                      {formatDistance(new Date(latestUptimeCheck.timestamp), new Date(), { addSuffix: true })}
                    </span> */}
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

  useEffect(() => {
    if (uptimeData.length > 0) {
      const uptimePercentage =
        (uptimeData.filter((check) => check.isExpectedStatus).length / uptimeData.length) * 100
      setUptimePercentage(uptimePercentage)
    } else {
      setUptimePercentage(null)
    }
  }, [uptimeData])

  useEffect(() => {
    if (uptimeData.length > 0) {
      const avgLatency =
        uptimeData.reduce((sum, check) => sum + (check.responseTime ?? 0), 0) / uptimeData.length
      setAvgLatency(avgLatency)
    } else {
      setAvgLatency(null)
    }
  }, [uptimeData])

  if (isLoading) {
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
          <EndpointMonitorDetailHeader
            endpointMonitor={endpointMonitor}
            onStatusChange={fetchWebsite}
          />

          <TimeRangeTabs
            value={timeRange}
            onValueChange={(value) => {
              const newTimeRange = value

              // Mark as transitioning immediately
              setIsTransitioning(true)

              // Delay the state update to allow tab animation to complete
              requestAnimationFrame(() => {
                startTransition(() => {
                  setTimeRange(newTimeRange)

                  // Update URL
                  const newPath =
                    newTimeRange === "1d"
                      ? `/endpoint-monitors/${endpointMonitorId}`
                      : `/endpoint-monitors/${endpointMonitorId}?range=${newTimeRange}`
                  void navigate({ href: newPath })

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
            {deferredUptimeData.length > 0 || (isUptimeDataLoading && hasLoadedDataOnce.current) ? (
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
