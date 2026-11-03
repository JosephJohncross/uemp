import { Printer } from 'lucide-react'

import { useCurrentUser } from '@/auth/useAuth'
import { DataTable } from '@/components/DataTable'
import { PageHeader } from '@/components/PageHeader'
import { PrintHeader } from '@/components/PrintHeader'
import { StatCard } from '@/components/StatCard'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
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
        <StatCard label="CGPA" value={data?.cgpa} hint="5.00 scale" />
        <StatCard label="Total units" value={data?.total_units} />
        <StatCard label="Semesters" value={data?.semesters.length} />
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
            <h2 className="font-semibold">{semester.semester_label}</h2>
            <p className="text-sm">
              GPA <span className="font-semibold tabular-nums">{semester.gpa}</span> ·{' '}
              {semester.total_units} units
            </p>
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
                cell: (s) => <span className="font-semibold">{s.grade}</span>,
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
