import { IconLoader2 } from "@tabler/icons-react"

export function DataTableLoadingOverlay() {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-[1px] z-20">
      <div className="flex flex-col items-center gap-2 p-4 rounded-md">
        <IconLoader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="text-sm text-muted-foreground">Loading endpoint Monitors...</span>
      </div>
    </div>
  )
}
