import type { endpointMonitorsSelectSchema, uptimeChecksSelectSchema } from "@solstatus/common/db"
import { msToHumanReadable, secsToHumanReadable } from "@solstatus/common/utils"
import {
  IconAlertTriangle,
  IconLoader2,
  IconPlayerPauseFilled,
  IconPlayerPlayFilled,
  IconRosetteDiscountCheckFilled,
  IconTrash,
} from "@tabler/icons-react"
import { formatDistance } from "date-fns"
import type * as React from "react"
import { useCallback, useEffect, useState } from "react"
import type { z } from "zod"
import { useIsMobile } from "@/registry/new-york-v4/hooks/use-mobile"
import { Badge } from "@/registry/new-york-v4/ui/badge"
import { Button } from "@/registry/new-york-v4/ui/button"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/registry/new-york-v4/ui/drawer"
import { Separator } from "@/registry/new-york-v4/ui/separator"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/registry/new-york-v4/ui/tooltip"
import {
  handleDeleteWebsite,
  handlePauseMonitoring,
  handleResumeMonitoring,
} from "./endpoint-monitor-actions"

interface WebsiteDetailDrawerProps {
  endpointMonitor: z.infer<typeof endpointMonitorsSelectSchema>
  trigger?: React.ReactNode
}

export function EndpointMonitorDetailDrawer({
  endpointMonitor,
  trigger,
}: WebsiteDetailDrawerProps) {
  const isMobile = useIsMobile()
  const createdAt = new Date(endpointMonitor.createdAt)
  const updatedAt = new Date(endpointMonitor.updatedAt)

  const [latestUptimeCheck, setLatestUptimeCheck] = useState<z.infer<
    typeof uptimeChecksSelectSchema
  > | null>(null)
  const [isLoadingCheck, setIsLoadingCheck] = useState(false)
  const [checkError, setCheckError] = useState<string | null>(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)

  const fetchLatestCheck = useCallback(async () => {
    if (!endpointMonitor.id) {
      return
    }
    setIsLoadingCheck(true)
    setCheckError(null)
    try {
      const response = await fetch(`/api/endpoint-monitors/${endpointMonitor.id}/uptime`)
      if (!response.ok) {
        if (response.status === 404) {
          setLatestUptimeCheck(null) // No check found yet
        } else {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
      } else {
        const data = await response.json()
        setLatestUptimeCheck(data as z.infer<typeof uptimeChecksSelectSchema>)
      }
    } catch (error) {
      console.error("Failed to fetch latest uptime check:", error)
      setCheckError("Failed to load latest check.")
    } finally {
      setIsLoadingCheck(false)
    }
  }, [endpointMonitor.id])

  useEffect(() => {
    // Only fetch when drawer is opened
    if (isDrawerOpen) {
      fetchLatestCheck()
    }
  }, [isDrawerOpen, fetchLatestCheck])

  const defaultTrigger = (
    <Button
      variant="link"
      className="text-foreground w-fit px-0 text-left"
      title={endpointMonitor.name}
    >
      {endpointMonitor.name.length > 32
        ? `${endpointMonitor.name.substring(0, 32)}...`
        : endpointMonitor.name}
    </Button>
  )

  return (
    <Drawer direction={isMobile ? "bottom" : "right"} onOpenChange={setIsDrawerOpen}>
      <DrawerTrigger asChild>{trigger || defaultTrigger}</DrawerTrigger>
      <DrawerContent>
        <DrawerHeader className="gap-1">
          <DrawerTitle className="break-all">{endpointMonitor.name}</DrawerTitle>
          <DrawerDescription>Monitor details and configuration</DrawerDescription>
        </DrawerHeader>
        <div className="flex flex-col gap-4 overflow-y-auto px-4 text-sm">
          <div className="grid gap-4">
            <div className="flex flex-col gap-1 min-w-0">
              <span className="font-medium">Id</span>
              <span className="break-all">{endpointMonitor.id}</span>
            </div>
            <div className="flex flex-col gap-1 min-w-0">
              <span className="font-medium">URL</span>
              <a
                href={endpointMonitor.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:underline break-all"
              >
                {endpointMonitor.url}
              </a>
            </div>

            {/* <Separator className="bg-black dark:bg-white"/> */}

            {/* Metadata Section */}
            <table className="w-full">
              <tbody className="divide-y">
                <tr className="hover:bg-muted">
                  <td className="py-2 font-medium text-sm pr-4">Operational</td>
                  <td className="py-2 text-sm text-right">
                    {endpointMonitor.isRunning ? (
                      <Badge variant="secondary" className="!bg-green-400 dark:!bg-green-700">
                        Active
                      </Badge>
                    ) : (
                      <Badge variant="destructive">Paused</Badge>
                    )}
                  </td>
                </tr>
                <tr className="hover:bg-muted">
                  <td className="py-2 font-medium text-sm pr-4">Check Interval</td>
                  <td className="py-2 text-sm text-right">
                    {secsToHumanReadable(endpointMonitor.checkInterval)}
                  </td>
                </tr>
                <tr className="hover:bg-muted">
                  <td className="py-2 font-medium text-sm pr-4">Alert Status</td>
                  <td className="py-2 text-sm text-right">
                    <Badge variant={endpointMonitor.activeAlert ? "destructive" : "outline"}>
                      {endpointMonitor.activeAlert ? "Alert Active" : "No Alert"}
                    </Badge>
                  </td>
                </tr>
                <tr className="hover:bg-muted">
                  <td className="py-2 font-medium text-sm pr-4">Consecutive Failures</td>
                  <td className="py-2 text-sm text-right">
                    <div className="flex items-center gap-1 justify-end">
                      {endpointMonitor.consecutiveFailures > 0 && (
                        <IconAlertTriangle className="h-4 w-4 text-amber-500" />
                      )}
                      <span>{endpointMonitor.consecutiveFailures}</span>
                    </div>
                  </td>
                </tr>
                <tr className="hover:bg-muted">
                  <td className="py-2 font-medium text-sm pr-4">Expected Status Code</td>
                  <td className="py-2 text-sm text-right">
                    {endpointMonitor.expectedStatusCode ? (
                      <Badge variant="secondary">{endpointMonitor.expectedStatusCode}</Badge>
                    ) : (
                      <Badge variant="secondary">2xx/3xx</Badge>
                    )}
                  </td>
                </tr>
              </tbody>
            </table>

            <Separator className="bg-black dark:bg-white" />

            {/* Latest Check Section */}
            <div className="flex flex-col gap-1">
              <span className="font-bold text-center">Latest Check</span>
              {isLoadingCheck ? (
                <IconLoader2 className="animate-spin h-4 w-4" />
              ) : checkError ? (
                <span className="text-red-500 text-xs">{checkError}</span>
              ) : latestUptimeCheck ? (
                <table className="w-full mt-2">
                  <tbody className="divide-y">
                    <tr className="hover:bg-muted">
                      <td className="py-2 font-medium text-sm pr-4">Status</td>
                      <td className="py-2 text-sm text-right">
                        <div className="flex items-center gap-1 justify-end">
                          <Badge
                            variant={latestUptimeCheck.isExpectedStatus ? "outline" : "destructive"}
                            className="text-xs px-1.5 py-0.5"
                          >
                            {latestUptimeCheck.isExpectedStatus ? (
                              <IconRosetteDiscountCheckFilled className="h-3 w-3 mr-1" />
                            ) : (
                              <IconAlertTriangle className="h-3 w-3 mr-1  " />
                            )}
                            {latestUptimeCheck.isExpectedStatus ? "OK" : "Down"}
                          </Badge>
                        </div>
                      </td>
                    </tr>
                    <tr className="hover:bg-muted">
                      <td className="py-2 font-medium text-sm pr-4">HTTP Status Code</td>
                      <td className="py-2 text-sm text-right">
                        {latestUptimeCheck.status === null ? (
                          <span className="text-gray-500">N/A</span>
                        ) : endpointMonitor.expectedStatusCode ? (
                          latestUptimeCheck.status === endpointMonitor.expectedStatusCode ? (
                            <span className="text-green-500">{latestUptimeCheck.status}</span>
                          ) : (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="text-red-500 underline decoration-dashed cursor-help">
                                    {latestUptimeCheck.status}
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Expected: {endpointMonitor.expectedStatusCode}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )
                        ) : (
                          <>
                            {" "}
                            {/* Fallback to original range-based coloring */}
                            {latestUptimeCheck.status <= 299 && (
                              <span className="text-green-500">{latestUptimeCheck.status}</span>
                            )}
                            {latestUptimeCheck.status >= 300 && latestUptimeCheck.status <= 399 && (
                              <span className="text-yellow-500">
                                3xx Redirect: {latestUptimeCheck.status}
                              </span>
                            )}
                            {latestUptimeCheck.status >= 400 && latestUptimeCheck.status <= 499 && (
                              <span className="text-orange-500">
                                4xx Error: {latestUptimeCheck.status}
                              </span>
                            )}
                            {latestUptimeCheck.status >= 500 && latestUptimeCheck.status <= 599 && (
                              <span className="text-red-500">
                                5xx Error: {latestUptimeCheck.status}
                              </span>
                            )}
                          </>
                        )}
                      </td>
                    </tr>
                    <tr className="hover:bg-muted">
                      <td className="py-2 font-medium text-sm pr-4">Checked At</td>
                      <td className="py-2 text-sm text-right">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="underline decoration-dashed cursor-help">
                                {formatDistance(new Date(latestUptimeCheck.timestamp), new Date(), {
                                  addSuffix: true,
                                })}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
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
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </td>
                    </tr>
                    <tr className="hover:bg-muted">
                      <td className="py-2 font-medium text-sm pr-4">Response Time</td>
                      <td className="py-2 text-sm text-right">
                        {msToHumanReadable(latestUptimeCheck.responseTime ?? 0, true)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              ) : (
                <span className="text-xs">No check data available.</span>
              )}
            </div>

            <Separator className="bg-black dark:bg-white" />

            <div className="grid grid-cols-2 gap-4 pb-4">
              <div className="flex flex-col gap-1">
                <span className="font-medium text-muted-foreground">Created</span>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="underline decoration-dashed cursor-help text-muted-foreground">
                        {formatDistance(createdAt, new Date(), {
                          addSuffix: true,
                        })}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>
                        {createdAt.toLocaleString(undefined, {
                          year: "numeric",
                          month: "numeric",
                          day: "numeric",
                          hour: "numeric",
                          minute: "numeric",
                          second: "numeric",
                          timeZoneName: "short",
                        })}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div className="flex flex-col gap-1">
                <span className="font-medium text-muted-foreground">Last Updated</span>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="underline decoration-dashed cursor-help text-muted-foreground">
                        {formatDistance(updatedAt, new Date(), {
                          addSuffix: true,
                        })}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>
                        {updatedAt.toLocaleString(undefined, {
                          year: "numeric",
                          month: "numeric",
                          day: "numeric",
                          hour: "numeric",
                          minute: "numeric",
                          second: "numeric",
                          timeZoneName: "short",
                        })}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
          </div>
        </div>
        <DrawerFooter className="flex-col gap-4">
          <Button variant="primary" asChild>
            <a href={`/endpoint-monitors/${endpointMonitor.id}`}>View Detailed Analytics</a>
          </Button>

          <div className="flex gap-3 justify-stretch w-full">
            <Button
              className="flex-1"
              variant="secondary"
              size="icon"
              onClick={() => handleResumeMonitoring(endpointMonitor.id)}
            >
              <IconPlayerPlayFilled />
              <span className="sr-only">Delete endpoint monitor</span>
            </Button>

            {endpointMonitor.isRunning && (
              <Button
                className="flex-1"
                variant="secondary"
                size="icon"
                onClick={() => handlePauseMonitoring(endpointMonitor.id)}
              >
                <IconPlayerPauseFilled />
                <span className="sr-only">Delete endpoint monitor</span>
              </Button>
            )}

            <Button
              className="flex-1"
              variant="destructive"
              size="icon"
              onClick={() => handleDeleteWebsite(endpointMonitor.id)}
            >
              <IconTrash />
              <span className="sr-only">Delete endpoint monitor</span>
            </Button>
          </div>

          <DrawerClose asChild>
            <Button variant="outline">Close</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}
