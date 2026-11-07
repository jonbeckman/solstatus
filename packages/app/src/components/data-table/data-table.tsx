import {
  type ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type OnChangeFn,
  type PaginationState,
  type RowSelectionState,
  type SortingState,
  useReactTable,
  type VisibilityState,
} from "@tanstack/react-table"
import { useNavigate, useSearch } from "@tanstack/react-router"
import { useState } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/registry/new-york-v4/ui/table"
import { type EndpointMonitorListParams, useEndpointMonitors } from "@/lib/api-queries"
import { Tabs, TabsContent } from "@/registry/new-york-v4/ui/tabs"
import type { EndpointMonitor, SortOrder } from "@/server/api/schemas"

import { columns } from "./columns"
import { DataRow } from "./data-row"
import { DataTableLoadingOverlay } from "./data-table-loading-overlay"
import { DataTableSkeleton } from "./data-table-skeleton"
import { Pagination } from "./pagination"
import { Toolbar } from "./toolbar"

// The dashboard URL search params. A key is present only when it differs from its default.
interface DashboardSearchParams {
  page?: number
  pageSize?: number
  search?: string
  orderBy?: string
  order?: SortOrder
}

function isTableUpdater<T>(updater: T | ((current: T) => T)): updater is (current: T) => T {
  return updater instanceof Function
}

export const DEFAULT_PAGE_SIZE = 10
export const DEFAULT_ORDER_BY = "consecutiveFailures"

const defaultColumnVisibility: VisibilityState = {
  createdAt: false,
  updatedAt: false,
  activeAlert: false,
}

const noMonitors: readonly EndpointMonitor[] = []

export function DataTable() {
  "use no memo"

  // The URL holds the page, page size, sort, and search, so a reload or a shared link keeps them.
  const search = useSearch({ from: "/" })
  const navigate = useNavigate({ from: "/" })

  const params: EndpointMonitorListParams = {
    page: search.page ?? 0,
    pageSize: search.pageSize ?? DEFAULT_PAGE_SIZE,
    orderBy: search.orderBy ?? DEFAULT_ORDER_BY,
    order: search.order ?? "desc",
    search: search.search ?? "",
  }

  const pagination: PaginationState = { pageIndex: params.page, pageSize: params.pageSize }
  const sorting: SortingState = [{ id: params.orderBy, desc: params.order === "desc" }]

  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const [columnVisibility, setColumnVisibility] = useState(defaultColumnVisibility)
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])

  const monitors = useEndpointMonitors(params)
  const data = monitors.data?.data ?? noMonitors
  const totalEndpointMonitors = monitors.data?.totalCount ?? 0

  // Omit default values, so the plain dashboard URL stays plain.
  const updateSearch = (next: Partial<EndpointMonitorListParams>) => {
    const merged = { ...params, ...next }
    const isDefaultSort = merged.orderBy === DEFAULT_ORDER_BY && merged.order === "desc"

    const search: DashboardSearchParams = {}

    if (merged.page !== 0) {
      search.page = merged.page
    }

    if (merged.pageSize !== DEFAULT_PAGE_SIZE) {
      search.pageSize = merged.pageSize
    }

    if (merged.search) {
      search.search = merged.search
    }

    if (!isDefaultSort) {
      search.orderBy = merged.orderBy
      search.order = merged.order
    }

    void navigate({ search })
  }

  const handleSortingChange: OnChangeFn<SortingState> = (updater) => {
    const [next] = isTableUpdater(updater) ? updater(sorting) : updater

    updateSearch(
      next
        ? { orderBy: next.id, order: next.desc ? "desc" : "asc", page: 0 }
        : { orderBy: DEFAULT_ORDER_BY, order: "desc", page: 0 },
    )
  }

  const handlePaginationChange: OnChangeFn<PaginationState> = (updater) => {
    const next = isTableUpdater(updater) ? updater(pagination) : updater

    updateSearch({ page: next.pageIndex, pageSize: next.pageSize })
  }

  const table = useReactTable({
    data: [...data],
    columns,
    state: {
      sorting,
      columnVisibility,
      rowSelection,
      columnFilters,
      pagination,
    },
    getRowId: (row) => row.id,
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onSortingChange: handleSortingChange,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: handlePaginationChange,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    manualPagination: true,
    pageCount: Math.max(1, Math.ceil(totalEndpointMonitors / pagination.pageSize)),
  })

  const hasData = data.length > 0
  const isLoading = monitors.isFetching

  return (
    <Tabs defaultValue="endpointMonitors" className="w-full flex-col justify-start gap-6">
      <Toolbar
        table={table}
        searchValue={params.search}
        onSearch={(term) => updateSearch({ search: term, page: 0 })}
      />
      <TabsContent value="endpointMonitors" className="relative flex flex-col gap-4 overflow-auto">
        {monitors.isPending ? (
          <DataTableSkeleton />
        ) : (
          <div className="overflow-hidden rounded-lg border relative">
            {isLoading && hasData && <DataTableLoadingOverlay />}
            <Table>
              <TableHeader className="bg-muted sticky top-0 z-10">
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => {
                      return (
                        <TableHead key={header.id} colSpan={header.colSpan}>
                          {header.isPlaceholder
                            ? null
                            : flexRender(header.column.columnDef.header, header.getContext())}
                        </TableHead>
                      )
                    })}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody className="**:data-[slot=table-cell]:first:w-8">
                {table.getRowModel().rows?.length ? (
                  table.getRowModel().rows.map((row) => <DataRow key={row.id} row={row} />)
                ) : (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="h-24 text-center">
                      No endpoint monitors found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
        <Pagination table={table} totalEndpointMonitors={totalEndpointMonitors} />
      </TabsContent>
    </Tabs>
  )
}
