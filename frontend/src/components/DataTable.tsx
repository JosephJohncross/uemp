import type { ReactNode } from 'react'

import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { ApiError } from '@/lib/api'
import { cn } from '@/lib/utils'

export interface Column<T> {
  header: ReactNode
  cell: (row: T) => ReactNode
  className?: string
}

interface DataTableProps<T> {
  columns: Column<T>[]
  rows: T[] | undefined
  rowKey: (row: T) => string | number
  isLoading?: boolean
  error?: ApiError | null
  empty?: ReactNode
  footer?: ReactNode
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  isLoading,
  error,
  empty = 'Nothing to show yet.',
  footer,
}: DataTableProps<T>) {
  return (
    <div className="overflow-hidden rounded-lg border bg-card">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((column, index) => (
                <TableHead key={index} className={column.className}>
                  {column.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading &&
              Array.from({ length: 4 }, (_, index) => (
                <TableRow key={index}>
                  {columns.map((_, cellIndex) => (
                    <TableCell key={cellIndex}>
                      <Skeleton className="h-4 w-full max-w-32" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            {!isLoading && (error || !rows?.length) && (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className={cn(
                    'h-24 text-center text-muted-foreground',
                    error && 'text-destructive',
                  )}
                >
                  {error ? error.message : empty}
                </TableCell>
              </TableRow>
            )}
            {!isLoading &&
              !error &&
              rows?.map((row) => (
                <TableRow key={rowKey(row)}>
                  {columns.map((column, index) => (
                    <TableCell key={index} className={column.className}>
                      {column.cell(row)}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>
      {footer && <div className="border-t px-4 py-2">{footer}</div>}
    </div>
  )
}

interface PagerProps {
  page: number
  count: number | undefined
  pageSize?: number
  onPageChange: (page: number) => void
}

export function Pager({ page, count, pageSize = 25, onPageChange }: PagerProps) {
  if (!count || count <= pageSize) {
    return <p className="text-xs text-muted-foreground">{count ?? 0} total</p>
  }
  const pages = Math.ceil(count / pageSize)
  return (
    <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
      <span>
        Page {page} of {pages} · {count} total
      </span>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= pages}
          onClick={() => onPageChange(page + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  )
}
