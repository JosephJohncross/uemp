import { cn } from '@/lib/utils'

interface ProgressBarProps {
  value: number
  max: number
  className?: string
  barClassName?: string
}

export function ProgressBar({ value, max, className, barClassName }: ProgressBarProps) {
  const percent = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0
  return (
    <div
      className={cn('h-2 w-full overflow-hidden rounded-full bg-muted', className)}
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
    >
      <div
        className={cn('h-full rounded-full bg-primary transition-all duration-700', barClassName)}
        style={{ width: `${percent}%` }}
      />
    </div>
  )
}
