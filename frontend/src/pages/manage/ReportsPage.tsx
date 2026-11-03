import { Printer } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'

import { useCurrentUser } from '@/auth/useAuth'
import { DataTable } from '@/components/DataTable'
import { FilterSelect } from '@/components/FilterSelect'
import { PageHeader } from '@/components/PageHeader'
import { StatCard } from '@/components/StatCard'
import { StatusBadge } from '@/components/StatusBadge'
import { Button } from '@/components/ui/button'
import { useApiQuery, useOptions } from '@/lib/queries'
import { ROLE_HOME } from '@/lib/roles'
import type { CourseReport, Semester } from '@/lib/types'

export default function ReportsPage() {
  const user = useCurrentUser()
  const [semester, setSemester] = useState('')
  const semesters = useOptions<Semester>('/semesters/')
  const { data, isLoading, error } = useApiQuery<CourseReport>('/reports/courses/', { semester })
  const courses = data?.courses ?? []

  const registrations = courses.reduce((sum, c) => sum + c.registered, 0)
  const graded = courses.filter((c) => c.average !== null)
  const average = graded.length
    ? (graded.reduce((sum, c) => sum + (c.average ?? 0), 0) / graded.length).toFixed(1)
    : null

  return (
    <>
      <PageHeader
        title="Course reports"
        description={`Registration and performance for ${data?.semester ?? 'the current semester'}.`}
        actions={
          <Button variant="outline" onClick={() => window.print()}>
            <Printer />
            Print
          </Button>
        }
      />

      <div className="print:hidden">
        <FilterSelect
          value={semester}
          onChange={setSemester}
          options={semesters.map((s) => ({ value: s.id, label: s.label }))}
          allLabel="Current semester"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Courses offered" value={courses.length} />
        <StatCard label="Course registrations" value={registrations} />
        <StatCard label="Average score" value={average} hint="Across courses with scores" />
      </div>

      <DataTable
        rows={courses}
        rowKey={(c) => c.course}
        isLoading={isLoading}
        error={error}
        empty="No courses ran in this semester."
        columns={[
          {
            header: 'Course',
            cell: (c) => (
              <div>
                <p className="font-medium">{c.code}</p>
                <p className="text-xs text-muted-foreground">{c.title}</p>
              </div>
            ),
          },
          { header: 'Lecturer', cell: (c) => c.lecturer ?? '—', className: 'hidden md:table-cell' },
          { header: 'Registered', cell: (c) => c.registered, className: 'text-right' },
          { header: 'Average', cell: (c) => c.average ?? '—', className: 'text-right' },
          {
            header: 'Pass rate',
            cell: (c) => (c.pass_rate === null ? '—' : `${c.pass_rate}%`),
            className: 'text-right',
          },
          {
            header: 'Results',
            cell: (c) =>
              c.result_sheet ? (
                <Link to={`${ROLE_HOME[user.role]}/results/${c.result_sheet}`}>
                  <StatusBadge status={c.result_status} />
                </Link>
              ) : (
                <StatusBadge status={null} />
              ),
          },
        ]}
      />
    </>
  )
}
