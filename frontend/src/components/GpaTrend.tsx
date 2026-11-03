import type { SemesterResult } from '@/lib/types'

const MAX_GPA = 5
const BAR_AREA_REM = 7

/** One bar per semester, height proportional to that semester's GPA. */
export function GpaTrend({ semesters }: { semesters: SemesterResult[] }) {
  if (!semesters.length) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">No approved results yet.</p>
    )
  }
  return (
    <div className="flex items-end gap-3 pt-2">
      {semesters.map((semester) => {
        const gpa = Number(semester.gpa)
        return (
          <div key={semester.semester} className="flex flex-1 flex-col items-center gap-2">
            <div className="flex h-36 w-full max-w-16 flex-col items-center justify-end gap-1">
              <span className="text-xs font-semibold tabular-nums">{semester.gpa}</span>
              <div
                className="w-full rounded-t-md bg-primary transition-all duration-700"
                style={{ height: `${Math.max(0.25, (gpa / MAX_GPA) * BAR_AREA_REM)}rem` }}
              />
            </div>
            <span className="text-center text-[0.7rem] leading-tight text-muted-foreground">
              {semester.semester_label.replace(' Semester', '')}
            </span>
          </div>
        )
      })}
    </div>
  )
}
