import { getUnixTime, subDays, subHours, subMinutes, subWeeks } from "date-fns"
import type { TimeRange } from "@/server/api/schemas"

type ChartDomain = [number | "auto", number | "auto"]

const rangeStart = (range: TimeRange, now: Date): number => {
  switch (range) {
    case "30m":
      return getUnixTime(subMinutes(now, 30))
    case "1h":
      return getUnixTime(subHours(now, 1))
    case "3h":
      return getUnixTime(subHours(now, 3))
    case "6h":
      return getUnixTime(subHours(now, 6))
    case "1d":
      return getUnixTime(subDays(now, 1))
    case "2d":
      return getUnixTime(subDays(now, 2))
    case "7d":
      return getUnixTime(subWeeks(now, 1))
  }
}

/**
 * The x-axis domain in Unix seconds for a chart of time buckets. The domain starts at the
 * beginning of the selected range and ends at the current time, or at the last bucket when
 * that bucket is later, so sparse data at the end still shows the full range.
 */
export const chartTimeDomain = (bucketTimes: readonly number[], range: TimeRange): ChartDomain => {
  const lastBucketTime = bucketTimes.at(-1)

  if (lastBucketTime === undefined) {
    return ["auto", "auto"]
  }

  const now = new Date()

  return [rangeStart(range, now), Math.max(getUnixTime(now), lastBucketTime)]
}
