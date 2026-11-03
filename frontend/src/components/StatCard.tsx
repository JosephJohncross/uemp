import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

import { AnimatedNumber } from '@/components/motion/animated-number'
import { Card } from '@/components/ui/card'

interface StatCardProps {
  label: string
  value: ReactNode
  hint?: ReactNode
  icon?: LucideIcon
  /** Decimal places when the value is a number, e.g. 2 for a GPA. */
  decimals?: number
}

export function StatCard({ label, value, hint, icon: Icon, decimals = 0 }: StatCardProps) {
  return (
    <Card className="gap-0 p-5 shadow-none">
      <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
        {label}
        {Icon && <Icon className="size-4" />}
      </div>
      <div className="mt-2 text-2xl font-semibold tracking-tight tabular-nums">
        {typeof value === 'number' ? (
          <AnimatedNumber value={value} format={(n) => n.toFixed(decimals)} duration={0.8} />
        ) : (
          (value ?? '—')
        )}
      </div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </Card>
  )
}
