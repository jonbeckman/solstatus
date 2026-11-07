import { IconChevronDown, IconLayoutColumns, IconSearch, IconX } from "@tabler/icons-react"
import type { ColumnDef, Table } from "@tanstack/react-table"
import { useState } from "react"
import type * as React from "react"
import { useDebouncedCallback } from "use-debounce"
import type { AppColumnDef } from "@/components/data-table/columns"

type EndpointMonitorRow = EndpointMonitor

function isAppColumn(
  columnDef: ColumnDef<EndpointMonitorRow>,
): columnDef is AppColumnDef<EndpointMonitorRow> {
  return "headerLabel" in columnDef
}

import { Button } from "@/registry/new-york-v4/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/registry/new-york-v4/ui/dropdown-menu"
import { Input } from "@/registry/new-york-v4/ui/input"
import type { EndpointMonitor } from "@/server/api/schemas"

interface ToolbarProps {
  table: Table<EndpointMonitor>
  searchValue: string
  onSearch: (term: string) => void
}

export function Toolbar({ table, searchValue: committedSearch, onSearch }: ToolbarProps) {
  "use no memo"

  // The input updates on every key. The URL, and so the query, updates after a pause.
  const [searchValue, setSearchValue] = useState(committedSearch)
  const handleSearch = useDebouncedCallback(onSearch, 500)

  const onSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchValue(e.target.value)
    handleSearch(e.target.value)
  }

  const clearSearch = () => {
    setSearchValue("")
    handleSearch.cancel()
    onSearch("")
  }

  return (
    <div className="flex items-center justify-between">
      <div className="relative flex items-center">
        <IconSearch className="absolute left-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search..."
          value={searchValue}
          onChange={onSearchChange}
          className="w-[200px] lg:w-[300px] pl-8"
        />
        {searchValue && (
          <Button variant="ghost" onClick={clearSearch} className="absolute right-1 h-6 w-6 p-0">
            <IconX className="h-4 w-4" />
          </Button>
        )}
      </div>
      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <IconLayoutColumns />
              <span className="hidden lg:inline">Customize Columns</span>
              <span className="lg:hidden">Columns</span>
              <IconChevronDown />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            {table
              .getAllColumns()
              .filter((column) => typeof column.accessorFn !== "undefined" && column.getCanHide())
              .map((column) => {
                const headerLabel =
                  (isAppColumn(column.columnDef) ? column.columnDef.headerLabel : undefined) ??
                  column.id

                return (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    className="capitalize"
                    checked={column.getIsVisible()}
                    onCheckedChange={(value) => column.toggleVisibility(!!value)}
                    onSelect={(e) => e.preventDefault()}
                  >
                    {headerLabel}
                  </DropdownMenuCheckboxItem>
                )
              })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
