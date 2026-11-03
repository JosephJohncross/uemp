import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

import { AnimatedNumber } from '@/components/motion/animated-number'
import { Card, CardContent } from '@/components/ui/card'

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
    <Card>
      <CardContent className="space-y-1">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          {label}
          {Icon && <Icon className="size-4" />}
        </div>
        <div className="text-2xl font-semibold tabular-nums">
          {typeof value === 'number' ? (
            <AnimatedNumber value={value} format={(n) => n.toFixed(decimals)} duration={0.8} />
          ) : (
            (value ?? '—')
          )}
        </div>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  )
}
