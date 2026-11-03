import { cn } from '@/lib/utils'
import type { SheetStatus, UserStatus } from '@/lib/types'

const STYLES: Record<SheetStatus | UserStatus, { label: string; badge: string; dot: string }> = {
  DRAFT: { label: 'Draft', badge: 'bg-slate-100 text-slate-700', dot: 'bg-slate-400' },
  SUBMITTED: {
    label: 'Awaiting review',
    badge: 'bg-amber-50 text-amber-800 ring-amber-200',
    dot: 'bg-amber-500',
  },
  APPROVED: {
    label: 'Approved',
    badge: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
    dot: 'bg-emerald-500',
  },
  RETURNED: {
    label: 'Returned',
    badge: 'bg-rose-50 text-rose-800 ring-rose-200',
    dot: 'bg-rose-500',
  },
  ACTIVE: {
    label: 'Active',
    badge: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
    dot: 'bg-emerald-500',
  },
  SUSPENDED: {
    label: 'Suspended',
    badge: 'bg-amber-50 text-amber-800 ring-amber-200',
    dot: 'bg-amber-500',
  },
  DEACTIVATED: { label: 'Deactivated', badge: 'bg-slate-100 text-slate-600', dot: 'bg-slate-400' },
}

export function StatusBadge({ status }: { status: SheetStatus | UserStatus | null }) {
  if (!status) return <span className="text-muted-foreground">—</span>
  const style = STYLES[status]
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ring-1 ring-transparent ring-inset',
        style.badge,
      )}
    >
      <span className={cn('size-1.5 rounded-full', style.dot)} />
      {style.label}
    </span>
  )
}
