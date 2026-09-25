import type { endpointMonitorsSelectSchema } from "@solstatus/common/db"
import type {
  ColumnFiltersState,
  PaginationState,
  SortingState,
  VisibilityState,
} from "@tanstack/react-table"
import { toast } from "sonner"
import type { z } from "zod"
import { create } from "zustand"
import { DEFAULT_TOAST_OPTIONS } from "@/lib/toasts"

interface DataTableState {
  // Data
  data: z.infer<typeof endpointMonitorsSelectSchema>[]
  totalEndpointMonitors: number
  isLoading: boolean
  lastRefreshed: number // Add timestamp for forcing refresh

  // Table state
  sorting: SortingState
  columnFilters: ColumnFiltersState
  columnVisibility: VisibilityState
  rowSelection: Record<string, boolean>
  pagination: PaginationState

  // Search state
  searchValue: string

  // Actions
  setData: (data: z.infer<typeof endpointMonitorsSelectSchema>[]) => void
  setTotalEndpointMonitors: (count: number) => void
  setIsLoading: (isLoading: boolean) => void
  setSorting: (sorting: SortingState) => void
  setColumnFilters: (columnFilters: ColumnFiltersState) => void
  setColumnVisibility: (columnVisibility: VisibilityState) => void
  setRowSelection: (rowSelection: Record<string, boolean>) => void
  setPagination: (pagination: PaginationState) => void
  setSearchValue: (searchValue: string) => void

  // Data fetching
  fetchEndpointMonitors: () => Promise<void>
}

export const useDataTableStore = create<DataTableState>((set, get) => ({
  // Initial state
  data: [],
  totalEndpointMonitors: 0,
  isLoading: false,
  lastRefreshed: Date.now(), // Initialize with current timestamp
  sorting: [{ id: "consecutiveFailures", desc: true }],
  columnFilters: [],
  columnVisibility: {
    createdAt: false,
    updatedAt: false,
    activeAlert: false,
  },
  rowSelection: {},
  pagination: {
    pageIndex: 0,
    pageSize: 10,
  },
  searchValue: "",

  // Actions
  setData: (data) => set({ data }),
  setTotalEndpointMonitors: (totalEndpointMonitors) =>
    set({ totalEndpointMonitors: totalEndpointMonitors }),
  setIsLoading: (isLoading) => set({ isLoading }),
  setSorting: (sorting) => set({ sorting }),
  setColumnFilters: (columnFilters) => set({ columnFilters }),
  setColumnVisibility: (columnVisibility) => set({ columnVisibility }),
  setRowSelection: (rowSelection) => set({ rowSelection }),
  setPagination: (pagination) => set({ pagination }),
  setSearchValue: (searchValue) => set({ searchValue }),

  // Data fetching
  fetchEndpointMonitors: async () => {
    const { pagination, searchValue, sorting } = get()

    set({ isLoading: true })

    try {
      // Construct URL with search and pagination parameters
      const queryParams = new URLSearchParams({
        pageSize: pagination.pageSize.toString(),
        page: pagination.pageIndex.toString(),
      })

      // Add sorting parameters if sorting state is not empty
      if (sorting.length > 0) {
        queryParams.set("orderBy", sorting[0].id)
        queryParams.set("order", sorting[0].desc ? "desc" : "asc")
      }

      // Add search parameter if present
      if (searchValue) {
        queryParams.set("search", searchValue)
      }

      // Fetch endpointMonitors with query parameters
      const response = await fetch(`/api/endpoint-monitors?${queryParams.toString()}`)

      if (!response.ok) {
        throw new Error("Failed to fetch endpointMonitors")
      }

      const responseData = (await response.json()) as {
        data: z.infer<typeof endpointMonitorsSelectSchema>[]
        totalCount: number
      }

      // Extract data and totalCount from the response
      const { data: endpointMonitorsData, totalCount } = responseData

      // Update state with received data and update lastRefreshed timestamp
      set({
        data: endpointMonitorsData as z.infer<typeof endpointMonitorsSelectSchema>[],
        totalEndpointMonitors: totalCount,
        lastRefreshed: Date.now(), // Update refresh timestamp
      })
    } catch (error) {
      console.error("Error fetching endpointMonitors:", error)
      toast.error("Failed to load endpointMonitors", {
        ...DEFAULT_TOAST_OPTIONS,
      })
    } finally {
      set({ isLoading: false })
    }
  },
}))
