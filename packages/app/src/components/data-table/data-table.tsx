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
import { useLocation, useNavigate } from "@tanstack/react-router"
import React from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/registry/new-york-v4/ui/table"
import { Tabs, TabsContent } from "@/registry/new-york-v4/ui/tabs"
import { useDataTableStore } from "@/store/data-table-store"
import { columns } from "./columns"
import { DataRow } from "./data-row"
import { DataTableLoadingOverlay } from "./data-table-loading-overlay"
import { DataTableSkeleton } from "./data-table-skeleton"
import { Pagination } from "./pagination"
import { Toolbar } from "./toolbar"

// Default pagination values
const DEFAULT_PAGE_INDEX = 0
const DEFAULT_PAGE_SIZE = 10

export function DataTable() {
  "use no memo"

  const navigate = useNavigate()
  const pathname = useLocation({ select: (location) => location.pathname })
  const searchStr = useLocation({ select: (location) => location.searchStr })
  const searchParams = new URLSearchParams(
    searchStr.startsWith("?") ? searchStr.slice(1) : searchStr,
  )

  // Get state and actions from the store
  const data = useDataTableStore((state) => state.data)
  const isLoading = useDataTableStore((state) => state.isLoading)
  const totalEndpointMonitors = useDataTableStore((state) => state.totalEndpointMonitors)
  const rowSelection = useDataTableStore((state) => state.rowSelection)
  const columnVisibility = useDataTableStore((state) => state.columnVisibility)
  const columnFilters = useDataTableStore((state) => state.columnFilters)
  const sorting = useDataTableStore((state) => state.sorting)
  const pagination = useDataTableStore((state) => state.pagination)

  // Update URL with query params, omitting default values
  const updateUrlParams = React.useCallback(
    (params: {
      page?: number
      pageSize?: number
      search?: string
      orderBy?: string
      order?: "asc" | "desc"
    }) => {
      const newParams = new URLSearchParams(searchParams.toString())

      // Handle page parameter - only include if not default (0)
      if (params.page !== undefined) {
        if (params.page === DEFAULT_PAGE_INDEX) {
          newParams.delete("page")
        } else {
          newParams.set("page", params.page.toString())
        }
      }

      // Handle pageSize parameter - only include if not default (10)
      if (params.pageSize !== undefined) {
        if (params.pageSize === DEFAULT_PAGE_SIZE) {
          newParams.delete("pageSize")
        } else {
          newParams.set("pageSize", params.pageSize.toString())
        }
      }

      // Handle search parameter - only include if not empty
      if (params.search !== undefined) {
        if (params.search) {
          newParams.set("search", params.search)
        } else {
          newParams.delete("search")
        }
      }

      // Handle sorting parameters, omitting defaults
      const isDefaultSort = params.orderBy === "consecutiveFailures" && params.order === "desc"

      if (params.orderBy === undefined && params.order === undefined) {
        // No sorting params passed in this update, existing ones remain or are absent
      } else if (isDefaultSort) {
        // If the intended sort IS the default, ensure the params are removed from URL
        newParams.delete("orderBy")
        newParams.delete("order")
      } else {
        // If the intended sort is NOT the default, set the params
        if (params.orderBy) {
          newParams.set("orderBy", params.orderBy)
          // Set order; if order is missing, it defaults to 'asc' implicitly by API,
          // but we can be explicit or remove it. Removing is cleaner.
          if (params.order) {
            newParams.set("order", params.order)
          } else {
            newParams.delete("order") // Remove order if not specified for non-default orderBy
          }
        } else {
          // Clearing sort explicitly (orderBy is '', null, or undefined)
          // Revert to default by removing params.
          newParams.delete("orderBy")
          newParams.delete("order")
        }
      }

      // Construct the new URL, omitting '?' if no parameters
      const queryString = newParams.toString()
      const newUrl = queryString ? `${pathname}?${queryString}` : pathname

      void navigate({ href: newUrl })
    },
    [pathname, searchParams, navigate],
  )

  // Handle state changes with proper typing
  const handleRowSelectionChange: OnChangeFn<RowSelectionState> = (updater) => {
    const store = useDataTableStore.getState()
    if (typeof updater === "function") {
      store.setRowSelection(updater(store.rowSelection) as Record<string, boolean>)
    } else {
      store.setRowSelection(updater as Record<string, boolean>)
    }
  }

  const handleSortingChange: OnChangeFn<SortingState> = (updater) => {
    const store = useDataTableStore.getState()
    let newSorting: SortingState
    if (typeof updater === "function") {
      newSorting = updater(store.sorting)
    } else {
      newSorting = updater
    }
    store.setSorting(newSorting) // Update store first

    // Update URL params based on new sorting state
    updateUrlParams({
      orderBy: newSorting[0]?.id,
      order: newSorting[0]?.desc ? "desc" : "asc",
    })

    // Fetch data with new sorting
    store.fetchEndpointMonitors()
  }

  const handleColumnFiltersChange: OnChangeFn<ColumnFiltersState> = (updater) => {
    const store = useDataTableStore.getState()
    if (typeof updater === "function") {
      store.setColumnFilters(updater(store.columnFilters))
    } else {
      store.setColumnFilters(updater)
    }
  }

  const handleVisibilityChange: OnChangeFn<VisibilityState> = (updater) => {
    const store = useDataTableStore.getState()
    if (typeof updater === "function") {
      store.setColumnVisibility(updater(store.columnVisibility))
    } else {
      store.setColumnVisibility(updater)
    }
  }

  const handlePaginationChange: OnChangeFn<PaginationState> = (updater) => {
    const store = useDataTableStore.getState()
    let newPagination: PaginationState

    if (typeof updater === "function") {
      newPagination = updater(store.pagination)
    } else {
      newPagination = updater
    }

    // Remove manual scroll - let router.push handle it
    // scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'auto' });

    // Always set the new pagination in the store
    store.setPagination(newPagination)

    // Update URL with new pagination values
    updateUrlParams({
      page: newPagination.pageIndex,
      pageSize: newPagination.pageSize,
    })

    // Fetch data with new pagination
    store.fetchEndpointMonitors()
  }

  // Initialize from URL params on first load
  React.useEffect(() => {
    const pageParam = searchParams.get("page")
    const pageSizeParam = searchParams.get("pageSize")
    const searchParam = searchParams.get("search")
    const orderByParam = searchParams.get("orderBy")
    const orderParam = searchParams.get("order")

    const store = useDataTableStore.getState()
    let needsUpdate = false

    // Update pagination from URL if present and different from store
    const currentPageIndex = store.pagination.pageIndex
    const currentPageSize = store.pagination.pageSize
    const targetPageIndex = pageParam ? Number.parseInt(pageParam, 10) : DEFAULT_PAGE_INDEX
    const targetPageSize = pageSizeParam ? Number.parseInt(pageSizeParam, 10) : DEFAULT_PAGE_SIZE
    if (targetPageIndex !== currentPageIndex || targetPageSize !== currentPageSize) {
      store.setPagination({
        pageIndex: targetPageIndex,
        pageSize: targetPageSize,
      })
      needsUpdate = true
    }

    // Update search from URL if present and different from store
    const currentSearchValue = store.searchValue
    const targetSearchValue = searchParam ?? ""
    if (targetSearchValue !== currentSearchValue) {
      store.setSearchValue(targetSearchValue)
      needsUpdate = true
    }

    // Update sorting from URL if present and different from store
    const currentSorting = store.sorting
    if (orderByParam) {
      const targetSorting: SortingState = [
        {
          id: orderByParam,
          desc: orderParam === "desc",
        },
      ]
      // Check if targetSorting is different from currentSorting
      if (
        currentSorting.length !== 1 ||
        currentSorting[0].id !== targetSorting[0].id ||
        currentSorting[0].desc !== targetSorting[0].desc
      ) {
        store.setSorting(targetSorting)
        needsUpdate = true
      }
    } else if (currentSorting.length > 0 && currentSorting[0].id !== "consecutiveFailures") {
      // If no sort params in URL, but current sort isn't the default, reset to default
      store.setSorting([{ id: "consecutiveFailures", desc: true }])
      needsUpdate = true
    }

    // Fetch data only if any state was updated or initially
    if (needsUpdate || store.data.length === 0) {
      // Fetch if state changed or data is empty
      store.fetchEndpointMonitors()
    }
  }, [searchParams]) // Only depend on searchParams

  const table = useReactTable({
    data,
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
    onRowSelectionChange: handleRowSelectionChange,
    onSortingChange: handleSortingChange,
    onColumnFiltersChange: handleColumnFiltersChange,
    onColumnVisibilityChange: handleVisibilityChange,
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

  return (
    <Tabs defaultValue="endpointMonitors" className="w-full flex-col justify-start gap-6">
      <Toolbar table={table} totalEndpointMonitors={totalEndpointMonitors} />
      <TabsContent value="endpointMonitors" className="relative flex flex-col gap-4 overflow-auto">
        {isLoading && !hasData ? (
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
        <Pagination table={table} />
      </TabsContent>
    </Tabs>
  )
}
