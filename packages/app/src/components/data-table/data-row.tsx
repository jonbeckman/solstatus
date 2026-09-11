import type { endpointMonitorsSelectSchema } from "@solstatus/common/db"
import type { Row } from "@tanstack/react-table"
import { flexRender } from "@tanstack/react-table"
import type { z } from "zod"
import { TableCell, TableRow } from "@/registry/new-york-v4/ui/table"

interface DataRowProps {
  row: Row<z.infer<typeof endpointMonitorsSelectSchema>>
}

export function DataRow({ row }: DataRowProps) {
  "use no memo"
  return (
    <TableRow data-state={row.getIsSelected() && "selected"} className="relative">
      {row.getVisibleCells().map((cell) => (
        <TableCell key={cell.id}>
          {flexRender(cell.column.columnDef.cell, cell.getContext())}
        </TableCell>
      ))}
    </TableRow>
  )
}
