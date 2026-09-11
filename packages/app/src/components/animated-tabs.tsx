// https://github.com/list-jonas/shadcn-ui-animated-tabs/blob/main/registry/animated-tabs/animated-tabs.tsx

import { Content, List, Root, Trigger } from "@radix-ui/react-tabs"
import React, { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"

function Tabs({ className, ...props }: React.ComponentProps<typeof Root>) {
  return <Root data-slot="tabs" className={cn("flex flex-col gap-2", className)} {...props} />
}

const TabsList = React.forwardRef<
  React.ElementRef<typeof List>,
  React.ComponentPropsWithoutRef<typeof List>
>(({ className, ...props }, ref) => {
  const [indicatorStyle, setIndicatorStyle] = useState({
    left: 0,
    top: 0,
    width: 0,
    height: 0,
  })
  const tabsListRef = useRef<HTMLDivElement | null>(null)

  const updateIndicator = React.useCallback(() => {
    if (!tabsListRef.current) {
      return
    }

    const activeTab = tabsListRef.current.querySelector<HTMLElement>('[data-state="active"]')
    if (!activeTab) {
      return
    }

    const activeRect = activeTab.getBoundingClientRect()
    const tabsRect = tabsListRef.current.getBoundingClientRect()

    requestAnimationFrame(() => {
      setIndicatorStyle({
        left: activeRect.left - tabsRect.left,
        top: activeRect.top - tabsRect.top,
        width: activeRect.width,
        height: activeRect.height,
      })
    })
  }, [])

  useEffect(() => {
    // Initial update
    const timeoutId = setTimeout(updateIndicator, 0)

    // Event listeners
    window.addEventListener("resize", updateIndicator)
    const observer = new MutationObserver(updateIndicator)

    if (tabsListRef.current) {
      observer.observe(tabsListRef.current, {
        attributes: true,
        childList: true,
        subtree: true,
      })
    }

    return () => {
      clearTimeout(timeoutId)
      window.removeEventListener("resize", updateIndicator)
      observer.disconnect()
    }
  }, [updateIndicator])

  return (
    <div className="relative" ref={tabsListRef}>
      <List
        ref={ref}
        data-slot="tabs-list"
        className={cn(
          "bg-muted text-muted-foreground relative inline-flex h-9 w-fit items-center justify-center rounded-lg p-[3px]",
          className,
        )}
        {...props}
      />
      <div
        className="absolute rounded-md border border-transparent bg-background shadow-sm dark:border-input dark:bg-input/30 transition-all duration-300 ease-in-out"
        style={indicatorStyle}
      />
    </div>
  )
})
TabsList.displayName = List.displayName

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof Trigger>,
  React.ComponentPropsWithoutRef<typeof Trigger>
>(({ className, ...props }, ref) => (
  <Trigger
    ref={ref}
    data-slot="tabs-trigger"
    className={cn(
      "data-[state=active]:text-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:outline-ring inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 rounded-md border border-transparent px-2 py-1 text-sm font-medium whitespace-nowrap transition-colors focus-visible:ring-[3px] focus-visible:outline-1 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 z-10",
      className,
    )}
    {...props}
  />
))
TabsTrigger.displayName = Trigger.displayName

const TabsContent = React.forwardRef<
  React.ElementRef<typeof Content>,
  React.ComponentPropsWithoutRef<typeof Content>
>(({ className, ...props }, ref) => (
  <Content
    ref={ref}
    data-slot="tabs-content"
    className={cn("flex-1 outline-none mt-2", className)}
    {...props}
  />
))
TabsContent.displayName = Content.displayName

export { Tabs, TabsContent, TabsList, TabsTrigger }
