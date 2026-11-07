import type { z } from "zod"
import type { endpointMonitorsSelectSchema } from "../db/zod-schema"

export function msToHumanReadable(ms: number, short = false, toFixed = 2): string {
  if (ms < 1000) {
    return `${ms.toFixed(0)}${short ? "" : " "}${short ? "ms" : "milliseconds"}`
  }

  return secsToHumanReadable(ms / 1000, short, toFixed)
}

export function secsToHumanReadable(seconds: number, short = false, toFixed = 0): string {
  if (seconds < 60) {
    return `${Number.parseFloat(seconds.toFixed(toFixed))}${short ? "" : " "}${short ? "s" : "seconds"}`
  }

  const minutes = Math.floor(seconds / 60)

  if (minutes < 60) {
    return `${Number.parseFloat(minutes.toFixed(toFixed))}${short ? "" : " "}${short ? "m" : "minutes"}`
  }

  const hours = Math.floor(minutes / 60)

  if (hours < 24) {
    return `${Number.parseFloat(hours.toFixed(toFixed))}${short ? "" : " "}${short ? "h" : "hours"}`
  }

  const days = Math.floor(hours / 24)

  return `${Number.parseFloat(days.toFixed(toFixed))}${short ? "" : " "}${short ? "d" : "days"}`
}

export function endpointSignature(
  endpointMonitor: z.infer<typeof endpointMonitorsSelectSchema>,
): string {
  return `[${endpointMonitor.id}](${endpointMonitor.url})`
}
