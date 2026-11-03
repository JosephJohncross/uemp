import { BookOpen, ClipboardList, GraduationCap, Users } from 'lucide-react'
import { Link } from 'react-router'

import { useCurrentUser } from '@/auth/useAuth'
import { DataTable } from '@/components/DataTable'
import { PageHeader } from '@/components/PageHeader'
import { StatCard } from '@/components/StatCard'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatDateTime } from '@/lib/format'
import { useApiQuery } from '@/lib/queries'
import type { Overview, Paginated, ResultSheet, SheetStatus } from '@/lib/types'

const SHEET_STATUS_LABELS: Record<SheetStatus, string> = {
  DRAFT: 'Draft',
  SUBMITTED: 'Awaiting review',
  RETURNED: 'Returned',
  APPROVED: 'Approved',
}

export default function DepartmentDashboard() {
  const user = useCurrentUser()
  const overview = useApiQuery<Overview>('/reports/overview/')
  const pending = useApiQuery<Paginated<ResultSheet>>('/result-sheets/', { status: 'SUBMITTED' })
  const data = overview.data

  return (
    <>
      <PageHeader
        title={user.staff_profile?.department_name ?? 'Department'}
        description={data?.semester ? `Current semester: ${data.semester}` : undefined}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Students"
          value={data?.students}
          hint={`${data?.active_students ?? 0} active`}
          icon={GraduationCap}
        />
        <StatCard label="Lecturers" value={data?.lecturers} icon={Users} />
        <StatCard
          label="Courses"
          value={data?.courses}
          hint={`${data?.programs ?? 0} program(s)`}
          icon={BookOpen}
        />
        <StatCard
          label="Registrations"
          value={data?.registrations}
          hint={`${data?.students_registered ?? 0} students registered`}
          icon={ClipboardList}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-3 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Results waiting for your review</h2>
            <Button asChild variant="outline" size="sm">
              <Link to="/department/results">All result sheets</Link>
            </Button>
          </div>
          <DataTable
            rows={pending.data?.results}
            rowKey={(sheet) => sheet.id}
            isLoading={pending.isLoading}
            error={pending.error}
            empty="Nothing to review right now."
            columns={[
              {
                header: 'Course',
                cell: (s) => (
                  <div>
                    <p className="font-medium">{s.course.code}</p>
                    <p className="text-xs text-muted-foreground">{s.course.title}</p>
                  </div>
                ),
              },
              {
                header: 'Submitted by',
                cell: (s) => s.submitted_by_name,
                className: 'hidden sm:table-cell',
              },
              {
                header: 'When',
                cell: (s) => formatDateTime(s.submitted_at),
                className: 'hidden md:table-cell',
              },
              {
                header: <span className="sr-only">Review</span>,
                cell: (s) => (
                  <Button asChild size="sm">
                    <Link to={`/department/results/${s.id}`}>Review</Link>
                  </Button>
                ),
                className: 'text-right',
              },
            ]}
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Result sheets this semester</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-2 text-sm">
              {(Object.keys(SHEET_STATUS_LABELS) as SheetStatus[]).map((status) => (
                <div key={status} className="flex items-center justify-between">
                  <dt className="text-muted-foreground">{SHEET_STATUS_LABELS[status]}</dt>
                  <dd className="font-semibold tabular-nums">
                    {data?.result_sheets?.[status] ?? 0}
                  </dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
