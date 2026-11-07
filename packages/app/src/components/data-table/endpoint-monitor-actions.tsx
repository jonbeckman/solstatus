import { toast } from "sonner"
import { runApi } from "@/lib/api-client"
import { refreshEndpointMonitors } from "@/lib/api-queries"
import { DEFAULT_TOAST_OPTIONS } from "@/lib/toasts"

export async function handleResumeMonitoring(endpointMonitorId: string) {
  return handleToggleStatus(endpointMonitorId, true)
}

export async function handlePauseMonitoring(endpointMonitorId: string) {
  return handleToggleStatus(endpointMonitorId, false)
}

export async function handleToggleStatus(endpointMonitorId: string, newStatus: boolean) {
  if (
    !confirm(
      `Are you sure you want to ${newStatus ? "resume" : "pause"} monitoring for this endpoint?`,
    )
  ) {
    return false
  }

  try {
    await runApi((client) =>
      newStatus
        ? client.endpointMonitors.resume({ params: { id: endpointMonitorId } })
        : client.endpointMonitors.pause({ params: { id: endpointMonitorId } }),
    )

    toast.success(`Successfully ${newStatus ? "resumed" : "paused"} monitoring`, {
      ...DEFAULT_TOAST_OPTIONS,
    })

    return true
  } catch (error) {
    console.error("Error toggling status:", error)
    toast.error(`Failed to ${newStatus ? "resume" : "pause"} monitoring`, {
      description: `${error}`,
      ...DEFAULT_TOAST_OPTIONS,
    })

    return false
  } finally {
    await refreshEndpointMonitors()
  }
}

export async function handleDeleteWebsite(endpointMonitorId: string) {
  if (!confirm("Are you sure you want to delete this endpoint monitor?")) {
    return false
  }

  try {
    await runApi((client) => client.endpointMonitors.delete({ params: { id: endpointMonitorId } }))

    toast.success("Endpoint monitor deleted successfully", {
      ...DEFAULT_TOAST_OPTIONS,
    })

    return true
  } catch (error) {
    console.error("Error deleting endpointMonitor:", error)
    toast.error("Failed to delete endpointMonitor", {
      description: `${error}`,
      ...DEFAULT_TOAST_OPTIONS,
    })

    return false
  } finally {
    await refreshEndpointMonitors()
  }
}
