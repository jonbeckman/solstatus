import { IconSettings } from "@tabler/icons-react"
import { memo, useState } from "react"
import { type RefreshInterval, useHeaderContext } from "@/context/header-context"
import { Button } from "@/registry/new-york-v4/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/registry/new-york-v4/ui/dropdown-menu"

const intervalLabels: Record<RefreshInterval, string> = {
  10: "10 seconds",
  30: "30 seconds",
  60: "1 minute",
  off: "Off",
}

export const RefreshProgressBar = memo(function RefreshProgressBar() {
  const { refreshInterval, setRefreshInterval, refreshProgress, isRefreshEnabled } =
    useHeaderContext()
  const [isHovered, setIsHovered] = useState(false)
  const [isDropdownOpen, setDropdownOpen] = useState(false)
  const [transitionDurationClass, setTransitionDurationClass] = useState("duration-200")

  const showDetails = isHovered || isDropdownOpen
  const hoverHeight = showDetails ? "h-8" : "h-1"

  const handleSelect = (interval: RefreshInterval) => {
    setRefreshInterval(interval)
    setTransitionDurationClass("duration-500")
    setTimeout(() => {
      setDropdownOpen(false)
      setIsHovered(false)
    }, 500)
  }

  const handleMouseEnter = () => {
    setTransitionDurationClass("duration-200")
    setIsHovered(true)
  }

  const handleMouseLeave = () => {
    setTransitionDurationClass("duration-500")
    setIsHovered(false)
  }

  return (
    <div
      className="pb-4"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      role="group"
    >
      <div
        role="progressbar"
        aria-label="Auto-refresh progress"
        className={`relative w-full ${hoverHeight} transition-all ${transitionDurationClass} ease-in-out bg-muted/80`}
      >
        {isRefreshEnabled && (
          <div className="flex justify-center h-full">
            <div
              className={"h-full bg-black dark:bg-white transition-all duration-300 ease-linear"}
              style={{ width: `${refreshProgress}%` }}
              // style={{ width: "10%" }}
            />
          </div>
        )}
        <div className={"absolute top-0 left-1/2 h-full w-fit -translate-x-1/2"}>
          <div
            className={`absolute inset-0 bg-black dark:bg-white transition-transform origin-center ${transitionDurationClass} ${
              showDetails ? "scale-x-100" : "scale-x-0"
            }`}
          />
          <div
            className={`relative flex h-full items-center justify-center gap-2 whitespace-nowrap px-3 text-secondary ${
              showDetails ? "opacity-100" : "opacity-0"
            }`}
          >
            <DropdownMenu onOpenChange={setDropdownOpen}>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 border-none focus-visible:ring-0"
                >
                  <IconSettings className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem onSelect={() => handleSelect(10)}>10 seconds</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => handleSelect(30)}>30 seconds</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => handleSelect(60)}>1 minute</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => handleSelect("off")}>Off</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <span className="text-sm">Auto-refresh: {intervalLabels[refreshInterval]}</span>
          </div>
        </div>
      </div>
    </div>
  )
})
