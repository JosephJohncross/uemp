import type { SheetStatus } from '@/lib/types'
import { cn } from '@/lib/utils'

const SEGMENTS: { status: SheetStatus; label: string; color: string }[] = [
  { status: 'APPROVED', label: 'Approved', color: 'bg-emerald-500' },
  { status: 'SUBMITTED', label: 'Awaiting review', color: 'bg-amber-400' },
  { status: 'RETURNED', label: 'Returned', color: 'bg-rose-500' },
  { status: 'DRAFT', label: 'Draft', color: 'bg-slate-300' },
]

/** How far the semester's result sheets have moved through the approval workflow. */
export function SheetStatusBreakdown({
  counts,
}: {
  counts?: Partial<Record<SheetStatus, number>>
}) {
  const total = SEGMENTS.reduce((sum, s) => sum + (counts?.[s.status] ?? 0), 0)
  const approved = counts?.APPROVED ?? 0

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between">
        <p className="text-3xl font-semibold tracking-tight tabular-nums">
          {total ? Math.round((approved / total) * 100) : 0}%
        </p>
        <p className="text-xs text-muted-foreground">
          {approved} of {total} sheets approved
        </p>
      </div>
      <div className="flex h-3 overflow-hidden rounded-full bg-muted">
        {SEGMENTS.map(({ status, color }) => {
          const value = counts?.[status] ?? 0
          return value ? (
            <div
              key={status}
              className={cn('h-full transition-all duration-700', color)}
              style={{ width: `${(value / total) * 100}%` }}
            />
          ) : null
        })}
      </div>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        {SEGMENTS.map(({ status, label, color }) => (
          <div key={status} className="flex items-center justify-between gap-2">
            <dt className="flex items-center gap-2 text-muted-foreground">
              <span className={cn('size-2 rounded-full', color)} />
              {label}
            </dt>
            <dd className="font-semibold tabular-nums">{counts?.[status] ?? 0}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
