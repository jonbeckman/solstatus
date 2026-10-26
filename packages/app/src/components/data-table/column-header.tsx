import { IconArrowDown, IconArrowsSort, IconArrowUp } from "@tabler/icons-react"
import type { Column } from "@tanstack/react-table"
import type * as React from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/registry/new-york-v4/ui/button"

function SortIcon({ direction }: { direction: false | "asc" | "desc" }) {
  if (direction === "desc") return <IconArrowDown className="ml-2 size-4" />

  if (direction === "asc") return <IconArrowUp className="ml-2 size-4" />

  return <IconArrowsSort className="ml-2 size-4" />
}

interface DataTableColumnHeaderProps<TData, TValue> extends React.HTMLAttributes<HTMLDivElement> {
  column: Column<TData, TValue>
  title: string
}

export function DataTableColumnHeader<TData, TValue>({
  column,
  title,
  className,
}: DataTableColumnHeaderProps<TData, TValue>) {
  "use no memo"

  if (!column.getCanSort()) {
    return <div className={cn(className)}>{title}</div>
  }

  return (
    <div className={cn("flex items-center space-x-2", className)}>
      <Button
        variant={column.getIsSorted() ? "accent" : "ghost"}
        size="sm"
        className="-ml-3 h-8"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        <span>{title}</span>
        <SortIcon direction={column.getIsSorted()} />
      </Button>
    </div>
  )
}
