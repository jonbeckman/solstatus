import type { endpointMonitorsSelectSchema } from "@solstatus/common/db"
import type { InfraMetadata } from "@solstatus/common/utils/types"
import type { z } from "zod"

/**
 * Opsgenie API integration for creating alerts
 *
 * Documentation: https://docs.opsgenie.com/docs/alert-api
 */

interface OpsgenieAlertPayload {
  message: string
  description?: string
  alias?: string
  responders?: Array<{
    id?: string
    username?: string
    name?: string
    type: "user" | "team" | "escalation" | "schedule"
  }>
  visibleTo?: Array<{
    id?: string
    username?: string
    name?: string
    type: "user" | "team"
  }>
  actions?: string[]
  tags?: string[]
  details?: Record<string, string>
  entity?: string
  source?: string
  priority?: "P1" | "P2" | "P3" | "P4" | "P5"
  user?: string
  note?: string
}

interface OpsgenieAlertResponse {
  result: string
  took: number
  requestId: string
  message?: string
}

/**
 * Send an alert to Opsgenie
 *
 * @param apiKey - Opsgenie API key
 * @param payload - Alert payload
 * @returns Response from Opsgenie API
 */
export async function sendOpsgenieAlert(
  apiKey: string,
  payload: OpsgenieAlertPayload,
): Promise<OpsgenieAlertResponse | null> {
  try {
    const response = await fetch("https://api.opsgenie.com/v2/alerts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `GenieKey ${apiKey}`,
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`Opsgenie API error (${response.status}): ${errorText}`)
      return null
    }

    return await response.json()
  } catch (error) {
    console.error("Error sending alert to Opsgenie:", error)
    return null
  }
}

/**
 * Create an alert for a failed endpointMonitor check
 *
 * @param apiKey - Opsgenie API key
 * @param endpointMonitor - EndpointMonitor that failed
 * @param infraMetadata - Infra metadata
 * @param status - HTTP status code (if any)
 * @param error - Error message (if any)
 * @returns Response from Opsgenie API
 */
export async function createEndpointMonitorDownAlert(
  apiKey: string,
  endpointMonitor: z.infer<typeof endpointMonitorsSelectSchema>,
  infraMetadata: InfraMetadata,
  status?: number,
  error?: string,
): Promise<OpsgenieAlertResponse | null> {
  const message = `Endpoint Monitor Down: ${endpointMonitor.name}`

  const description = status
    ? `Endpoint Monitor ${endpointMonitor.name} (${endpointMonitor.url}) is down with status code ${status}.`
    : `Endpoint Monitor ${endpointMonitor.name} (${endpointMonitor.url}) is down. ${error || ""}`

  return sendOpsgenieAlert(apiKey, {
    message,
    description,
    alias: `endpointMonitor-down-${endpointMonitor.url.replace(/[^a-zA-Z0-9]/g, "-")}`,
    priority: "P2",
    tags: ["solstatus", "down"],
    entity: endpointMonitor.url,
    source: "SolStatus",
    details: {
      endpointMonitor: endpointMonitor.name,
      endpointMonitorId: endpointMonitor.id,
      url: endpointMonitor.url,
      status: status?.toString() || "N/A",
      error: error || "",
      monitorRepo: "https://github.com/jonbeckman/solstatus",
      cfMonitorExecDashboard: `https://dash.cloudflare.com/${infraMetadata.cloudflareAccountId}/workers/services/view/${infraMetadata.monitorExecName}/production/observability/logs?view=events&needle=%7B%22value%22%3A%22%28${encodeURIComponent(endpointMonitor.url)}%29%22%2C%22matchCase%22%3Afalse%2C%22isRegex%22%3Afalse%7D&time=%7B%22value%22%3A3%2C%22unit%22%3A%22days%22%2C%22type%22%3A%22relative%22%7D`,
      cfMonitorTriggerDashboard: `https://dash.cloudflare.com/${infraMetadata.cloudflareAccountId}/workers/services/view/${infraMetadata.monitorTriggerName}/production/observability/logs?view=events&needle=%7B%22value%22%3A%22%5B${encodeURIComponent(endpointMonitor.id)}%5D%22%2C%22isRegex%22%3Afalse%2C%22matchCase%22%3Afalse%7D&time=%7B%22value%22%3A3%2C%22unit%22%3A%22days%22%2C%22type%22%3A%22relative%22%7D`,
    },
  })
}
