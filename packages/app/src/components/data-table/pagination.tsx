import type { endpointMonitorsSelectSchema } from "@solstatus/common/db"
import {
  IconChevronLeft,
  IconChevronRight,
  IconChevronsLeft,
  IconChevronsRight,
} from "@tabler/icons-react"
import type { Table } from "@tanstack/react-table"
import React, { useId } from "react"
import type { z } from "zod"
import { Button } from "@/registry/new-york-v4/ui/button"
import { Label } from "@/registry/new-york-v4/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/registry/new-york-v4/ui/select"
import { useDataTableStore } from "@/store/data-table-store"

interface PaginationProps {
  table: Table<z.infer<typeof endpointMonitorsSelectSchema>>
}

export function Pagination({ table }: PaginationProps) {
  "use no memo"
  const rowsPerPageId = useId()
  const pagination = useDataTableStore((state) => state.pagination)
  const totalEndpointMonitors = useDataTableStore((state) => state.totalEndpointMonitors)

  // Calculate page count locally to ensure it's consistent
  const pageCount = Math.max(1, Math.ceil(totalEndpointMonitors / pagination.pageSize))

  // Function to handle page changes - Simplified to rely on table handler
  const changePage = React.useCallback(
    (newPageIndex: number) => {
      // const newPagination = { ...pagination, pageIndex: newPageIndex }
      // setPagination(newPagination)
      // Trigger the table's pagination change which will fetch data
      table.setPageIndex(newPageIndex)
    },
    // [pagination, setPagination, table],
    [table], // Dependency only on table
  )

  return (
    <div className="flex items-center justify-between px-4 py-2 border-t">
      <div>
        <div className="text-muted-foreground hidden flex-1 text-sm lg:flex">
          Total query count: {totalEndpointMonitors}
        </div>
        <div className="text-muted-foreground hidden flex-1 text-sm lg:flex">
          {table.getFilteredSelectedRowModel().rows.length} of{" "}
          {table.getFilteredRowModel().rows.length} row(s) selected.
        </div>
      </div>
      <div className="flex w-full items-center gap-8 lg:w-fit">
        <div className="hidden items-center gap-2 lg:flex">
          <Label htmlFor="rows-per-page" className="text-sm font-medium">
            Rows per page
          </Label>
          <Select
            value={`${pagination.pageSize}`}
            onValueChange={(value) => {
              const size = Number(value)
              // setPagination({ ...pagination, pageSize: size })
              table.setPageSize(size)
            }}
          >
            <SelectTrigger size="sm" className="w-20" id={rowsPerPageId}>
              <SelectValue placeholder={pagination.pageSize} />
            </SelectTrigger>
            <SelectContent side="top">
              {[5, 10, 25].map((pageSize) => (
                <SelectItem key={pageSize} value={`${pageSize}`}>
                  {pageSize}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex w-fit items-center justify-center text-sm font-medium">
          Page {pagination.pageIndex + 1} of {pageCount}
        </div>
        <div className="ml-auto flex items-center gap-2 lg:ml-0">
          <Button
            variant="outline"
            className="hidden h-8 w-8 p-0 lg:flex"
            onClick={() => changePage(0)}
            disabled={!table.getCanPreviousPage()}
          >
            <span className="sr-only">Go to first page</span>
            <IconChevronsLeft />
          </Button>
          <Button
            variant="outline"
            className="size-8"
            size="icon"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <span className="sr-only">Go to previous page</span>
            <IconChevronLeft />
          </Button>
          <Button
            variant="outline"
            className="size-8"
            size="icon"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            <span className="sr-only">Go to next page</span>
            <IconChevronRight />
          </Button>
          <Button
            variant="outline"
            className="hidden h-8 w-8 p-0 lg:flex"
            onClick={() => changePage(pageCount - 1)}
            disabled={!table.getCanNextPage()}
          >
            <span className="sr-only">Go to last page</span>
            <IconChevronsRight />
          </Button>
        </div>
      </div>
    </div>
  )
}
