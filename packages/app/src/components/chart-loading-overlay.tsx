import { IconLoader2 } from "@tabler/icons-react"

interface ChartLoadingOverlayProps {
  message?: string
}

export function ChartLoadingOverlay({ message = "Refreshing data..." }: ChartLoadingOverlayProps) {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-background/40 backdrop-blur-[1px] z-10 rounded-lg">
      <div className="flex items-center gap-2 p-3 rounded-md bg-background/80 shadow-sm">
        <IconLoader2 className="h-4 w-4 animate-spin text-primary" />
        <span className="text-sm text-muted-foreground">{message}</span>
      </div>
    </div>
  )
}
