import type { endpointMonitorsSelectSchema } from "@solstatus/common/db"
import { secsToHumanReadable } from "@solstatus/common/utils"
import { IconBellExclamation, IconLayoutSidebarRightExpand } from "@tabler/icons-react"
import type { ColumnDef } from "@tanstack/react-table"
import type { z } from "zod"
import { LatencyLimitChart } from "@/components/latency-limit-chart"
import { Badge } from "@/registry/new-york-v4/ui/badge"
import { Button } from "@/registry/new-york-v4/ui/button"
import { Checkbox } from "@/registry/new-york-v4/ui/checkbox"
import { useDataTableStore } from "@/store/data-table-store"
import { DataTableColumnHeader } from "./column-header"
import { EndpointMonitorDetailDrawer } from "./endpoint-monitor-detail-drawer"

// Helper function for date formatting
const formatDate = (value: string | number | Date | null | undefined): string => {
  if (value) {
    const date = new Date(value)
    // Check if the date is valid after parsing
    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleDateString()
    }
  }

  return "N/A"
}

const displayName = (name: string | null | undefined, url: string) => {
  const textToDisplay = name || url
  return textToDisplay.length > 32 ? `${textToDisplay.substring(0, 32)}...` : textToDisplay
}

// Custom ColumnDef type with optional headerLabel
export type AppColumnDef<TData> = ColumnDef<TData> & {
  headerLabel?: string
}

export const columns: AppColumnDef<z.infer<typeof endpointMonitorsSelectSchema>>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <div className="flex items-center justify-center">
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      </div>
    ),
    cell: ({ row }) => (
      <div className="flex items-center justify-center">
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      </div>
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "name",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Name" className="pl-3" />,
    headerLabel: "Name",
    cell: ({ row }) => {
      return (
        <a href={`/endpoint-monitors/${row.original.id}`} className="hover:underline pl-3">
          {displayName(row.original.name, row.original.url)}
        </a>
      )
    },
    enableHiding: false,
  },
  {
    id: "latency",
    accessorKey: "url",
    header: "Latency",
    headerLabel: "Latency",
    maxSize: 300,
    cell: ({ row }) => {
      const lastRefreshed = useDataTableStore((state) => state.lastRefreshed)
      return (
        <div className="w-[300px]">
          <LatencyLimitChart
            key={`${row.original.id}-${lastRefreshed}`}
            endpointMonitorId={row.original.id}
            limit={30}
            height={40}
          />
        </div>
      )
    },
  },
  {
    accessorKey: "checkInterval",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Check Interval" />,
    headerLabel: "Check Interval",
    cell: ({ row }) => {
      const seconds = row.getValue("checkInterval") as number
      return <span>{secsToHumanReadable(seconds)}</span>
    },
    enableHiding: true,
  },
  {
    accessorKey: "consecutiveFailures",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Consecutive Failures" />,
    headerLabel: "Consecutive Failures",
    cell: ({ row }) => {
      const failures = row.getValue("consecutiveFailures") as number | null

      // Center the content
      return (
        <div className="text-center">
          {failures === 1 ? (
            <Badge variant="secondary" className="!bg-yellow-400 dark:!bg-yellow-700">
              {failures}
            </Badge>
          ) : failures !== null && failures >= 2 ? (
            <Badge variant="destructive">{failures}</Badge>
          ) : (
            // Display 0 or — normally
            <span>{failures ?? "—"}</span>
          )}
        </div>
      )
    },
    enableHiding: true,
  },
  {
    accessorKey: "isRunning",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
    headerLabel: "Status",
    cell: ({ row }) => {
      const isRunning = row.getValue("isRunning") as boolean

      if (isRunning) {
        return (
          <Badge variant="secondary" className="!bg-green-400 dark:!bg-green-700">
            Running
          </Badge>
        )
      }

      return <Badge variant="destructive">Paused</Badge>
    },
  },
  {
    accessorKey: "activeAlert",
    headerLabel: "Alert Status",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Alert Status" />,
    cell: ({ row }) => {
      const hasAlert = row.getValue("activeAlert") as boolean
      return (
        <div className="flex items-center justify-center">
          {hasAlert ? (
            <IconBellExclamation className="text-destructive" stroke={1.5} />
          ) : (
            <Badge variant="outline" className="px-2 py-1">
              —
            </Badge>
          )}
        </div>
      )
    },
  },
  {
    accessorKey: "createdAt",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Created At" />,
    headerLabel: "Created At",
    cell: ({ row }) => {
      const value = row.getValue("createdAt")
      return formatDate(value as string | number | Date | null | undefined)
    },
    enableHiding: true,
  },
  {
    accessorKey: "updatedAt",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Updated At" />,
    headerLabel: "Updated At",
    cell: ({ row }) => {
      const value = row.getValue("updatedAt")
      return formatDate(value as string | number | Date | null | undefined)
    },
    enableHiding: true,
  },
  {
    id: "open-drawer",
    cell: ({ row }) => (
      <EndpointMonitorDetailDrawer
        endpointMonitor={row.original}
        trigger={
          <Button
            variant="ghost"
            className="data-[state=open]:bg-muted text-muted-foreground flex size-8"
            size="icon"
          >
            <IconLayoutSidebarRightExpand />
            <span className="sr-only">Open endpoint monitor details drawer</span>
          </Button>
        }
      />
    ),
  },
]
