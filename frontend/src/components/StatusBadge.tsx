import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { SheetStatus, UserStatus } from '@/lib/types'

const STYLES: Record<SheetStatus | UserStatus, { label: string; className: string }> = {
  DRAFT: { label: 'Draft', className: 'bg-muted text-muted-foreground' },
  SUBMITTED: { label: 'Awaiting review', className: 'bg-amber-100 text-amber-900' },
  APPROVED: { label: 'Approved', className: 'bg-emerald-100 text-emerald-900' },
  RETURNED: { label: 'Returned', className: 'bg-red-100 text-red-900' },
  ACTIVE: { label: 'Active', className: 'bg-emerald-100 text-emerald-900' },
  SUSPENDED: { label: 'Suspended', className: 'bg-amber-100 text-amber-900' },
  DEACTIVATED: { label: 'Deactivated', className: 'bg-muted text-muted-foreground' },
}

export function StatusBadge({ status }: { status: SheetStatus | UserStatus | null }) {
  if (!status) return <span className="text-muted-foreground">—</span>
  const style = STYLES[status]
  return <Badge className={cn('border-transparent', style.className)}>{style.label}</Badge>
}
