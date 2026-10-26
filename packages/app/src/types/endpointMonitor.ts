import type { endpointMonitorsSelectSchema } from "@solstatus/common/db"
import type { z } from "zod"

export type TimeRange = "30m" | "1h" | "3h" | "6h" | "1d" | "2d" | "7d"

export function isTimeRange(value: string | null): value is TimeRange {
  return (
    value === "30m" ||
    value === "1h" ||
    value === "3h" ||
    value === "6h" ||
    value === "1d" ||
    value === "2d" ||
    value === "7d"
  )
}

export interface ConflictEndpointMonitorResponse {
  message: string
  matchingEndpointMonitor: z.infer<typeof endpointMonitorsSelectSchema>
}
