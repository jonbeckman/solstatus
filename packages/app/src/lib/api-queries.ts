import { QueryClient, keepPreviousData, useQuery } from "@tanstack/react-query"
import * as Effect from "effect/Effect"
import { runApi } from "@/lib/api-client"
import type { SortOrder, TimeRange } from "@/server/api/schemas"

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Pages show their own error state. A silent retry would hide it.
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
})

export const endpointMonitorKeys = {
  all: ["endpoint-monitors"] as const,
  list: (params: EndpointMonitorListParams) => ["endpoint-monitors", "list", params] as const,
  stats: ["endpoint-monitors", "stats"] as const,
  detail: (id: string) => ["endpoint-monitors", "detail", id] as const,
  latestCheck: (id: string) => ["endpoint-monitors", "latest-check", id] as const,
  recentLatency: (id: string, limit: number) =>
    ["endpoint-monitors", "recent-latency", id, limit] as const,
  uptimeRange: (id: string, range: TimeRange) =>
    ["endpoint-monitors", "uptime-range", id, range] as const,
}

export interface EndpointMonitorListParams {
  readonly page: number
  readonly pageSize: number
  readonly orderBy: string
  readonly order: SortOrder
  readonly search: string
}

// Refetch every endpoint monitor query on the page, for example after a write or on the
// dashboard's auto-refresh tick.
export function refreshEndpointMonitors() {
  // A request already in flight finishes. It is not cancelled and sent again.
  return queryClient.invalidateQueries(
    { queryKey: endpointMonitorKeys.all },
    { cancelRefetch: false },
  )
}

export function useEndpointMonitors(params: EndpointMonitorListParams) {
  return useQuery({
    queryKey: endpointMonitorKeys.list(params),
    queryFn: () =>
      runApi((client) =>
        client.endpointMonitors.list({
          query: {
            page: params.page,
            pageSize: params.pageSize,
            orderBy: params.orderBy,
            order: params.order,
            search: params.search,
          },
        }),
      ),
    placeholderData: keepPreviousData,
  })
}

export function useDashboardStats() {
  return useQuery({
    queryKey: endpointMonitorKeys.stats,
    queryFn: () => runApi((client) => client.endpointMonitors.stats()),
    refetchInterval: 60_000,
  })
}

export function useEndpointMonitor(id: string) {
  return useQuery({
    queryKey: endpointMonitorKeys.detail(id),
    // A deleted or unknown monitor resolves to null, so the page can leave.
    queryFn: () =>
      runApi((client) =>
        client.endpointMonitors
          .get({ params: { id } })
          .pipe(Effect.catchTag("NotFoundError", () => Effect.succeed(null))),
      ),
  })
}

export function useLatestCheck(id: string, options: { readonly enabled?: boolean } = {}) {
  return useQuery({
    queryKey: endpointMonitorKeys.latestCheck(id),
    enabled: options.enabled ?? true,
    queryFn: () => runApi((client) => client.endpointMonitors.latestCheck({ params: { id } })),
  })
}

export function useRecentLatency(id: string, limit: number) {
  return useQuery({
    queryKey: endpointMonitorKeys.recentLatency(id, limit),
    queryFn: () =>
      runApi((client) =>
        client.endpointMonitors.recentLatency({ params: { id }, query: { limit } }),
      ),
  })
}

export function useUptimeRange(id: string, range: TimeRange) {
  return useQuery({
    queryKey: endpointMonitorKeys.uptimeRange(id, range),
    queryFn: () =>
      runApi((client) => client.endpointMonitors.uptimeRange({ params: { id }, query: { range } })),
    placeholderData: keepPreviousData,
  })
}

export function useInfraMetadata() {
  return useQuery({
    queryKey: ["infra-metadata"],
    queryFn: () => runApi((client) => client.infra.metadata()),
    staleTime: Number.POSITIVE_INFINITY,
  })
}
