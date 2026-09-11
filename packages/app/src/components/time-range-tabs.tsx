import { Tabs, TabsList, TabsTrigger } from "@/components/animated-tabs"
import type { TimeRange } from "@/types/endpointMonitor"

interface TimeRangeTabsProps {
  value: TimeRange
  onValueChange: (value: TimeRange) => void
}

const timeRanges: TimeRange[] = ["30m", "1h", "3h", "6h", "1d", "2d", "7d"]

export function TimeRangeTabs({ value, onValueChange }: TimeRangeTabsProps) {
  return (
    <Tabs value={value} onValueChange={(val) => onValueChange(val as TimeRange)} className="w-full">
      <div className="flex justify-end items-center mb-3">
        <TabsList className="h-auto p-1">
          {timeRanges.map((range) => (
            <TabsTrigger
              key={range}
              value={range}
              className="px-3 py-1.5 text-sm font-medium transition-colors duration-200"
            >
              {range}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>
    </Tabs>
  )
}
