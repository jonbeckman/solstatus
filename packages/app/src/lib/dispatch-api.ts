import { getWorkerEnv } from "@/lib/worker-env"
import { auth } from "@/lib/auth"
import * as endpointMonitors from "@/app/api/endpoint-monitors/route"
import * as endpointMonitorById from "@/app/api/endpoint-monitors/[id]/route"
import * as endpointMonitorStats from "@/app/api/endpoint-monitors/stats/route"
import * as endpointMonitorExecuteCheck from "@/app/api/endpoint-monitors/[id]/execute-check/route"
import * as endpointMonitorPause from "@/app/api/endpoint-monitors/[id]/pause/route"
import * as endpointMonitorResume from "@/app/api/endpoint-monitors/[id]/resume/route"
import * as endpointMonitorUptime from "@/app/api/endpoint-monitors/[id]/uptime/route"
import * as endpointMonitorUptimeLimit from "@/app/api/endpoint-monitors/[id]/uptime/limit/route"
import * as endpointMonitorUptimeRange from "@/app/api/endpoint-monitors/[id]/uptime/range/route"

type RouteModule = Record<
  string,
  (request: Request, context?: { params?: Record<string, string> }) => Promise<Response> | Response
>

function matchRoute(
  pathname: string,
): { handlers: RouteModule; params: Record<string, string> } | null {
  if (pathname === "/api/endpoint-monitors") {
    return { handlers: endpointMonitors, params: {} }
  }
  if (pathname === "/api/endpoint-monitors/stats") {
    return { handlers: endpointMonitorStats, params: {} }
  }

  const idMatch = pathname.match(/^\/api\/endpoint-monitors\/([^/]+)(?:\/(.*))?$/)
  if (!idMatch) {
    return null
  }

  const id = decodeURIComponent(idMatch[1])
  const rest = idMatch[2] ?? ""
  const params = { id }

  if (rest === "") {
    return { handlers: endpointMonitorById, params }
  }
  if (rest === "execute-check") {
    return { handlers: endpointMonitorExecuteCheck, params }
  }
  if (rest === "pause") {
    return { handlers: endpointMonitorPause, params }
  }
  if (rest === "resume") {
    return { handlers: endpointMonitorResume, params }
  }
  if (rest === "uptime") {
    return { handlers: endpointMonitorUptime, params }
  }
  if (rest === "uptime/limit") {
    return { handlers: endpointMonitorUptimeLimit, params }
  }
  if (rest === "uptime/range") {
    return { handlers: endpointMonitorUptimeRange, params }
  }

  return null
}

async function infraMetadataResponse() {
  const { env } = getWorkerEnv()
  return Response.json({
    cloudflareAccountId: env.CLOUDFLARE_ACCOUNT_ID,
    monitorExecName: env.MONITOR_EXEC_NAME,
    monitorTriggerName: env.MONITOR_TRIGGER_NAME,
  })
}

export async function dispatchApi(request: Request): Promise<Response> {
  const url = new URL(request.url)
  const pathname = url.pathname

  if (pathname.startsWith("/api/auth")) {
    return auth.handler(request)
  }

  if (pathname === "/api/infra-metadata") {
    return infraMetadataResponse()
  }

  const matched = matchRoute(pathname)
  if (!matched) {
    return Response.json({ message: "Not Found" }, { status: 404 })
  }

  const handler = matched.handlers[request.method]
  if (!handler) {
    return new Response(null, { status: 405 })
  }

  return handler(request, { params: matched.params })
}
