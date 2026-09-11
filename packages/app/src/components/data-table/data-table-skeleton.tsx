import { Skeleton } from "@/registry/new-york-v4/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/registry/new-york-v4/ui/table"

interface DataTableSkeletonProps {
  columnCount?: number
  rowCount?: number
  showHeader?: boolean
}

export function DataTableSkeleton({
  columnCount = 7,
  rowCount = 10,
  showHeader = true,
}: DataTableSkeletonProps) {
  return (
    <div className="overflow-hidden rounded-lg border">
      <Table>
        {showHeader && (
          <TableHeader className="bg-muted sticky top-0 z-10">
            <TableRow>
              {Array.from({ length: columnCount }).map((_, index) => (
                <TableHead key={`header-${index + 0}`}>
                  <Skeleton className="h-6 w-full max-w-[100px]" />
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
        )}
        <TableBody>
          {Array.from({ length: rowCount }).map((_, rowIndex) => (
            <TableRow key={`row-${rowIndex + 0}`}>
              {Array.from({ length: columnCount }).map((_, cellIndex) => (
                <TableCell key={`cell-${rowIndex + 0}-${cellIndex + 0}`}>
                  {cellIndex === 0 || cellIndex === 1 ? (
                    <Skeleton className="h-5 w-5" />
                  ) : cellIndex === 2 ? (
                    <Skeleton className="h-5 w-full max-w-[150px]" />
                  ) : cellIndex === 3 ? (
                    <Skeleton className="h-10 w-[300px]" />
                  ) : cellIndex === columnCount - 1 ? (
                    <Skeleton className="h-8 w-8 rounded-full" />
                  ) : (
                    <Skeleton className="h-5 w-full max-w-[80px]" />
                  )}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
