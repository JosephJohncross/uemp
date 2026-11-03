import { CalendarCheck, GraduationCap, Printer, TrendingUp } from 'lucide-react'

import { useCurrentUser } from '@/auth/useAuth'
import { DataTable } from '@/components/DataTable'
import { PageHeader } from '@/components/PageHeader'
import { PrintHeader } from '@/components/PrintHeader'
import { GradeBadge } from '@/components/GradeBadge'
import { StatCard } from '@/components/StatCard'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { classOfDegree } from '@/lib/classOfDegree'
import { useApiQuery } from '@/lib/queries'
import type { StudentResults } from '@/lib/types'

export default function ResultsPage() {
  const user = useCurrentUser()
  const { data, isLoading, error } = useApiQuery<StudentResults>('/student/results/')

  return (
    <>
      <PrintHeader title="Statement of results" user={user} />

      <PageHeader
        title="Results"
        description="Only results approved by the department are shown."
        actions={
          <Button
            variant="outline"
            onClick={() => window.print()}
            disabled={!data?.semesters.length}
          >
            <Printer />
            Print statement
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="CGPA"
          value={data ? Number(data.cgpa) : undefined}
          decimals={2}
          hint={data?.semesters.length ? classOfDegree(Number(data.cgpa)) : '5.00 scale'}
          icon={TrendingUp}
        />
        <StatCard label="Units earned" value={data?.total_units} icon={GraduationCap} />
        <StatCard label="Semesters completed" value={data?.semesters.length} icon={CalendarCheck} />
      </div>

      {isLoading && <Skeleton className="h-48 w-full" />}
      {error && <p className="text-destructive">{error.message}</p>}
      {data && !data.semesters.length && (
        <p className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
          No approved results yet.
        </p>
      )}

      {[...(data?.semesters ?? [])].reverse().map((semester) => (
        <section key={semester.semester} className="space-y-3 break-inside-avoid">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold tracking-tight">{semester.semester_label}</h2>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">{semester.total_units} units</span>
              <span className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground tabular-nums">
                GPA {semester.gpa}
              </span>
            </div>
          </div>
          <DataTable
            rows={semester.scores}
            rowKey={(score) => score.course.id}
            columns={[
              { header: 'Code', cell: (s) => <span className="font-medium">{s.course.code}</span> },
              { header: 'Title', cell: (s) => s.course.title },
              { header: 'Units', cell: (s) => s.course.units, className: 'text-right' },
              {
                header: 'CA',
                cell: (s) => s.ca_score,
                className: 'hidden text-right sm:table-cell',
              },
              {
                header: 'Exam',
                cell: (s) => s.exam_score,
                className: 'hidden text-right sm:table-cell',
              },
              { header: 'Total', cell: (s) => s.total, className: 'text-right' },
              {
                header: 'Grade',
                cell: (s) => <GradeBadge grade={s.grade} />,
                className: 'text-center',
              },
              { header: 'Point', cell: (s) => s.grade_point, className: 'text-right' },
            ]}
          />
        </section>
      ))}
    </>
  )
}
