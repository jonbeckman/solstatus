import { toast } from "sonner"
import { z } from "zod"
import { create } from "zustand"
import { DEFAULT_TOAST_OPTIONS } from "@/lib/toasts"

const dashboardStatsSchema = z.object({
  totalEndpointMonitors: z.number(),
  sitesWithAlerts: z.number(),
  highestResponseTime: z.number(),
  highestResponseTimeWebsiteId: z.string().nullable().optional(),
  uptimePercentage: z.number(),
})

export interface DashboardStats {
  totalEndpointMonitors: number
  sitesWithAlerts: number
  highestResponseTime: number
  highestResponseTimeWebsiteId: string | null
  uptimePercentage: number
}

interface StatsState {
  // Data
  stats: DashboardStats | null
  isLoading: boolean
  error: string | null

  // Actions
  fetchDashboardStats: () => Promise<void>
}

export const useStatsStore = create<StatsState>((set, _get) => ({
  // Initial state
  stats: null,
  isLoading: true,
  error: null,

  fetchDashboardStats: async () => {
    set({ isLoading: true, error: null })

    try {
      const response = await fetch("/api/endpoint-monitors/stats")

      if (!response.ok) {
        throw new Error("Failed to fetch dashboard statistics")
      }

      const parsed = dashboardStatsSchema.parse(await response.json())
      set({
        stats: {
          ...parsed,
          highestResponseTimeWebsiteId: parsed.highestResponseTimeWebsiteId ?? null,
        },
        isLoading: false,
        error: null,
      })
    } catch (error) {
      console.error("Error fetching dashboard stats:", error)

      const errorMessage =
        error instanceof Error ? error.message : "An unknown error occurred while fetching stats"

      set({
        isLoading: false,
        error: errorMessage,
        stats: null,
      })

      toast.error("Failed to load dashboard statistics", {
        ...DEFAULT_TOAST_OPTIONS,
      })
    }
  },
}))
