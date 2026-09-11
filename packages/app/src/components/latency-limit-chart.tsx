// @ts-nocheck -- recharts 2 class components are not valid JSX under React 19 types

import { useEffect, useMemo, useState } from "react"
import { Line, LineChart } from "recharts"
import { Badge } from "@/registry/new-york-v4/ui/badge"
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/registry/new-york-v4/ui/chart"
import { Skeleton } from "@/registry/new-york-v4/ui/skeleton"

interface LatencyLimitChartProps {
  endpointMonitorId: string
  limit?: number
  height?: number
}

interface LatencyDataPoint {
  timestamp: string
  responseTime: number
  gradientColor: string
}

// Function to determine color based on response time
const getColorForResponseTime = (responseTime: number): string => {
  if (responseTime < 100) {
    return "#3498DB" // blue
  }
  if (responseTime < 200) {
    return "#2ECC71" // green
  }
  if (responseTime < 500) {
    return "#F1C40F" // yellow
  }
  if (responseTime < 1000) {
    return "#D35400" // orange
  }
  if (responseTime < 3000) {
    return "#C0392B" // red
  }
  return "#8E44AD" // purple
}

export function LatencyLimitChart({
  endpointMonitorId,
  limit = 30,
  height = 75,
}: LatencyLimitChartProps) {
  const [data, setData] = useState<LatencyDataPoint[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchLatencyData = async () => {
      setIsLoading(true)
      try {
        const response = await fetch(
          `/api/endpoint-monitors/${endpointMonitorId}/uptime/limit?limit=${limit}`,
        )
        if (!response.ok) {
          console.error(`Failed to fetch latency data: ${response.statusText}`)
          setData([])
          return
        }
        const responseData = (await response.json()) as {
          timestamp: string
          responseTime: number
        }[]

        // Format data with gradient colors based on response time
        const formattedData = responseData.map((point) => ({
          timestamp: point.timestamp,
          responseTime: point.responseTime,
          gradientColor: getColorForResponseTime(point.responseTime),
        }))

        setData(formattedData)
      } catch (error) {
        console.error("Error fetching latency data:", error)
        setData([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchLatencyData()
  }, [endpointMonitorId, limit])

  // Calculate min/max response times for gradient calculation
  const { minResponseTime, maxResponseTime } = useMemo(() => {
    if (data.length === 0) {
      return { minResponseTime: 0, maxResponseTime: 0 }
    }
    const responseTimes = data.map((d) => d.responseTime)
    const minVal = Math.min(...responseTimes)
    const maxVal = Math.max(...responseTimes)
    // Add a small buffer if min and max are the same to avoid division by zero
    return {
      minResponseTime: minVal,
      maxResponseTime: minVal === maxVal ? maxVal + 1 : maxVal,
    }
  }, [data])

  // Generate gradient stops based on response time values and thresholds (Smooth)
  const gradientStops = useMemo(() => {
    const range = maxResponseTime - minResponseTime
    if (range <= 0) {
      const color = getColorForResponseTime(minResponseTime)
      return [
        { offset: "0%", color },
        { offset: "100%", color },
      ]
    }

    // Define thresholds and their corresponding colors
    const thresholds = [
      { value: 100, color: getColorForResponseTime(100) },
      { value: 200, color: getColorForResponseTime(200) },
      { value: 500, color: getColorForResponseTime(500) },
      { value: 1000, color: getColorForResponseTime(1000) },
      { value: 3000, color: getColorForResponseTime(3000) },
      // Add a final threshold slightly above the max possible if needed,
      // or rely on the maxResponseTime stop.
      // Example: { value: 5000, color: getColorForResponseTime(5000) }
    ]

    const stops = []
    // Add start stop (color for minResponseTime)
    stops.push({ offset: 0, color: getColorForResponseTime(minResponseTime) })

    // Add stops for each threshold within the data range
    for (const t of thresholds) {
      if (t.value >= minResponseTime && t.value <= maxResponseTime) {
        const offsetPercent = ((t.value - minResponseTime) / range) * 100
        stops.push({ offset: offsetPercent, color: t.color })
      }
    }

    // Add end stop (color for maxResponseTime)
    stops.push({ offset: 100, color: getColorForResponseTime(maxResponseTime) })

    // Sort, clamp, format, and remove duplicates
    return (
      stops
        .sort((a, b) => a.offset - b.offset)
        .map((stop) => ({
          offset: `${Math.max(0, Math.min(100, stop.offset))}%`, // Clamp offset
          color: stop.color,
        }))
        // Remove consecutive stops with the same offset OR same color
        // (allowing same color at different offsets for solid bands if needed,
        // but removing redundant stops at the exact same location)
        .filter(
          (stop, index, self) =>
            index === 0 ||
            stop.offset !== self[index - 1].offset ||
            stop.color !== self[index - 1].color,
        )
        // Remove consecutive stops with the same color to ensure smooth transition
        .filter(
          (stop, index, self) =>
            index === 0 ||
            index === self.length - 1 ||
            stop.color !== self[index - 1].color ||
            stop.color !== self[index + 1].color,
        )
    )
  }, [minResponseTime, maxResponseTime])

  // Show placeholder when loading
  if (isLoading) {
    return <Skeleton className="w-full h-full" style={{ height }} />
  }

  // Show message when no data
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center" style={{ height }}>
        <Badge variant="outline" className="w-fit">
          No data available
        </Badge>
      </div>
    )
  }

  if (data.length < 3) {
    return (
      <div className="flex items-center justify-center" style={{ height }}>
        <Badge variant="outline" className="w-fit">
          Not enough data points yet
        </Badge>
      </div>
    )
  }

  const chartConfig = {
    responseTime: {
      label: "Latency",
    },
  } satisfies ChartConfig

  return (
    <div className="rounded-lg" style={{ height }}>
      {/* <ResponsiveContainer width="100%" height="100%"> */}
      <ChartContainer config={chartConfig} className="w-full h-full">
        <LineChart data={data} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
          <defs>
            {/* Vertical gradient for stroke color (Inverted) */}
            {/* y1=100% (bottom), y2=0% (top) */}
            <linearGradient id="colorResponseTime" x1="0%" y1="100%" x2="0%" y2="0%">
              {gradientStops.map((stop, i) => {
                console.log("stop", stop)
                return (
                  <stop
                    key={`stroke-${i}-${stop.offset}`}
                    offset={stop.offset}
                    stopColor={stop.color}
                    stopOpacity={1}
                  />
                )
              })}
            </linearGradient>
          </defs>

          <ChartTooltip
            cursor={false}
            content={
              <ChartTooltipContent
                hideLabel
                className="bg-accent min-w-auto"
                labelClassName=""
                formatter={(value, name) => {
                  if (name === "responseTime" && typeof value === "number") {
                    if (value >= 1000) {
                      const seconds = value / 1000
                      return (
                        <p className="text-xs">
                          <span className="font-semibold">{seconds.toFixed(2)}</span> s
                        </p>
                      )
                    }
                    return (
                      <p className="text-xs">
                        <span className="font-semibold">{value.toFixed(0)}</span> ms
                      </p>
                    )
                  }

                  return value
                }}
              />
            }
          />

          <Line
            type="bump"
            dataKey="responseTime"
            stroke="url(#colorResponseTime)"
            strokeWidth={height < 100 ? 2 : 3}
            dot={false}
            animationDuration={0}
            isAnimationActive={false}
          />
        </LineChart>
      </ChartContainer>
      {/* </ResponsiveContainer> */}
    </div>
  )
}
