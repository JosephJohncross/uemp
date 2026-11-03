import { cn } from '@/lib/utils'

export function GradeBadge({ grade }: { grade: string }) {
  if (!grade) return <span className="text-muted-foreground">—</span>
  return <span className={cn('font-semibold', grade === 'F' && 'text-destructive')}>{grade}</span>
}
