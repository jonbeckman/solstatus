import { IconActivity, IconLogs, IconMetronome, IconPencil } from "@tabler/icons-react"
import { ExternalLink, MoreVertical, Pause, Play, RefreshCw } from "lucide-react"
import { useMutation } from "@tanstack/react-query"
import { toast } from "sonner"
import { runApi } from "@/lib/api-client"
import { refreshEndpointMonitors, useInfraMetadata } from "@/lib/api-queries"
import { DEFAULT_TOAST_OPTIONS } from "@/lib/toasts"
import { Badge } from "@/registry/new-york-v4/ui/badge"
import { Button } from "@/registry/new-york-v4/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/registry/new-york-v4/ui/dropdown-menu"
import type { EndpointMonitor } from "@/server/api/schemas"
import { AddEndpointMonitorDialog } from "./add-endpoint-monitor-dialog"

interface WebsiteDetailHeaderProps {
  endpointMonitor: EndpointMonitor
}

// Creatively format URLs based on length
function formatUrl(url: string, maxLength: number): string {
  // If URL is short enough, return as-is
  if (url.length <= maxLength) {
    return url
  }

  try {
    const urlObj = new URL(url)

    // Start with just the hostname (FQDN)
    let formatted = urlObj.hostname

    // If we have a pathname and it's not just "/"
    if (urlObj.pathname && urlObj.pathname !== "/") {
      const pathParts = urlObj.pathname.split("/").filter(Boolean)

      // Calculate remaining space for path
      const remainingSpace = maxLength - formatted.length - 3 // -3 for "..."

      if (remainingSpace > 0 && pathParts.length > 0) {
        // Try to show the most specific (last) parts of the path
        let pathToShow = ""
        let isPartialPath = false

        // Start from the end and work backwards
        for (let i = pathParts.length - 1; i >= 0; i--) {
          const part = pathParts[i]
          const tentativePath = i === pathParts.length - 1 ? `/${part}` : `/${part}${pathToShow}`

          if (tentativePath.length <= remainingSpace) {
            pathToShow = tentativePath

            // Check if we've included all parts
            if (i === 0) {
              isPartialPath = false
            } else {
              isPartialPath = true
            }
          } else {
            // If even one segment is too long, truncate it
            if (pathToShow === "") {
              const truncatedPart = part.substring(0, Math.max(0, remainingSpace - 4)) // -4 for "/..."
              pathToShow = `/${truncatedPart}...`
            }

            isPartialPath = true
            break
          }
        }

        // Add ellipsis at the beginning only if we're showing a partial path
        if (isPartialPath && pathToShow && !pathToShow.includes("...")) {
          formatted += `/...${pathToShow}`
        } else {
          formatted += pathToShow
        }
      }
    }

    return formatted
  } catch {
    // If URL parsing fails, just truncate the original
    return `${url.substring(0, maxLength - 3)}...`
  }
}

type MonitorAction = "executeCheck" | "pause" | "resume"

const actionToasts: Record<
  MonitorAction,
  { success: string; description: string; failure: string }
> = {
  executeCheck: {
    success: "Check executed",
    description: "The endpoint monitor check has been manually executed.",
    failure: "Failed to execute check",
  },
  pause: {
    success: "Monitoring paused",
    description: "Endpoint monitoring has been paused.",
    failure: "Failed to pause monitoring",
  },
  resume: {
    success: "Monitoring resumed",
    description: "Endpoint monitoring has been resumed.",
    failure: "Failed to resume monitoring",
  },
}

export function EndpointMonitorDetailHeader({ endpointMonitor }: WebsiteDetailHeaderProps) {
  const { data: infraMetadata } = useInfraMetadata()

  const action = useMutation({
    mutationFn: (kind: MonitorAction) =>
      runApi((client) => client.endpointMonitors[kind]({ params: { id: endpointMonitor.id } })),
    onSuccess: (_response, kind) => {
      toast.success(actionToasts[kind].success, {
        description: actionToasts[kind].description,
        ...DEFAULT_TOAST_OPTIONS,
      })
    },
    onError: (error, kind) => {
      toast.error(actionToasts[kind].failure, {
        description: `${error}`,
        ...DEFAULT_TOAST_OPTIONS,
      })
    },
    onSettled: () => refreshEndpointMonitors(),
  })

  const isLoading = action.isPending
  const executeCheck = () => action.mutate("executeCheck")
  const pauseMonitoring = () => action.mutate("pause")
  const resumeMonitoring = () => action.mutate("resume")

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div className="min-w-0 flex-1">
        <a
          href={endpointMonitor.url}
          target="_blank"
          rel="noopener noreferrer"
          className="group relative flex items-center mt-2 hover:text-muted-foreground text-3xl font-bold mr-6"
          title={endpointMonitor.url}
        >
          <ExternalLink className="absolute -left-6 h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
          <span className="overflow-hidden text-ellipsis">
            <span className="sm:hidden">{formatUrl(endpointMonitor.url, 16)}</span>
            <span className="hidden sm:inline md:hidden">{formatUrl(endpointMonitor.url, 24)}</span>
            <span className="hidden md:inline lg:hidden">{formatUrl(endpointMonitor.url, 40)}</span>
            <span className="hidden lg:inline xl:hidden">{formatUrl(endpointMonitor.url, 60)}</span>
            <span className="hidden xl:inline">{formatUrl(endpointMonitor.url, 80)}</span>
          </span>
        </a>

        <div className="mt-2 text-sm text-muted-foreground flex items-center gap-1.5 flex-wrap">
          <Badge variant="secondary">
            Expected Status:{" "}
            {endpointMonitor.expectedStatusCode ? (
              <span>{endpointMonitor.expectedStatusCode}</span>
            ) : (
              <span>2xx/3xx</span>
            )}
          </Badge>
          <Badge variant="secondary">Alert Threshold: {endpointMonitor.alertThreshold}</Badge>
        </div>
      </div>
      <div className="flex flex-col sm:flex-row gap-4">
        {infraMetadata && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" disabled={isLoading}>
                Logs
                <IconLogs className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <a
                  href={`https://dash.cloudflare.com/${infraMetadata.cloudflareAccountId}/workers/services/view/${infraMetadata.monitorExecName}/production/observability/logs?view=events&needle=%7B%22value%22%3A%22%28${encodeURIComponent(endpointMonitor.url)}%29%22%2C%22matchCase%22%3Afalse%2C%22isRegex%22%3Afalse%7D&time=%7B%22value%22%3A3%2C%22unit%22%3A%22days%22%2C%22type%22%3A%22relative%22%7D`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <IconActivity className="mr-2 h-4 w-4" />
                  View Execution
                </a>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <a
                  href={`https://dash.cloudflare.com/${infraMetadata.cloudflareAccountId}/workers/services/view/${infraMetadata.monitorTriggerName}/production/observability/logs?view=events&needle=%7B%22value%22%3A%22%5B${encodeURIComponent(endpointMonitor.id)}%5D%22%2C%22isRegex%22%3Afalse%2C%22matchCase%22%3Afalse%7D&time=%7B%22value%22%3A3%2C%22unit%22%3A%22days%22%2C%22type%22%3A%22relative%22%7D`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <IconMetronome className="mr-2 h-4 w-4" />
                  View Trigger
                </a>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="primary" disabled={isLoading}>
              Actions
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <AddEndpointMonitorDialog
              endpointMonitor={endpointMonitor}
              trigger={
                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                  <IconPencil className="mr-2 h-4 w-4" />
                  Edit Endpoint Monitor
                </DropdownMenuItem>
              }
            />
            <DropdownMenuItem onClick={executeCheck} disabled={isLoading}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Execute Check
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            {endpointMonitor.isRunning && (
              <DropdownMenuItem onClick={pauseMonitoring} disabled={isLoading}>
                <Pause className="mr-2 h-4 w-4" />
                Pause Monitoring
              </DropdownMenuItem>
            )}

            {!endpointMonitor.isRunning && (
              <DropdownMenuItem onClick={resumeMonitoring} disabled={isLoading}>
                <Play className="mr-2 h-4 w-4" />
                Resume Monitoring
              </DropdownMenuItem>
            )}

            {endpointMonitor.isRunning && (
              <DropdownMenuItem onClick={resumeMonitoring} disabled={isLoading}>
                <Play className="mr-2 h-4 w-4" />
                Force Resume Monitoring
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
