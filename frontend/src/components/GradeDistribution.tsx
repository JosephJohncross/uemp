import { cn } from '@/lib/utils'

const GRADES = ['A', 'B', 'C', 'D', 'E', 'F']

/** A small column chart of how many students got each grade. */
export function GradeDistribution({ counts }: { counts: Record<string, number> }) {
  const highest = Math.max(1, ...Object.values(counts))
  return (
    <div className="flex h-24 items-end gap-2">
      {GRADES.map((grade) => {
        const count = counts[grade] ?? 0
        return (
          <div key={grade} className="flex flex-1 flex-col items-center gap-1">
            <span className="text-[0.7rem] font-semibold tabular-nums">{count || ''}</span>
            <div
              className={cn('w-full rounded-t-sm', count ? 'bg-primary' : 'bg-muted')}
              style={{ height: `${count ? Math.max(8, (count / highest) * 56) : 4}px` }}
            />
            <span className="text-xs font-medium text-muted-foreground">{grade}</span>
          </div>
        )
      })}
    </div>
  )
}
