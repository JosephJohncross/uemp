import { Building2, ClipboardCheck, GraduationCap, Users } from 'lucide-react'
import { Link } from 'react-router'

import { DataTable } from '@/components/DataTable'
import { PageHeader } from '@/components/PageHeader'
import { StatCard } from '@/components/StatCard'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatDateTime } from '@/lib/format'
import { useApiQuery } from '@/lib/queries'
import type { AuditEntry, Overview, Paginated } from '@/lib/types'

export default function AdminDashboard() {
  const overview = useApiQuery<Overview>('/reports/overview/')
  const activity = useApiQuery<Paginated<AuditEntry>>('/audit-logs/', { page_size: 8 })
  const data = overview.data
  const sheets = data?.result_sheets

  return (
    <>
      <PageHeader
        title="University overview"
        description={
          data?.semester ? `Current semester: ${data.semester}` : 'No current semester set.'
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Faculties & departments"
          value={data ? `${data.faculties} / ${data.departments}` : undefined}
          hint={`${data?.programs ?? 0} programs · ${data?.courses ?? 0} courses`}
          icon={Building2}
        />
        <StatCard
          label="Students"
          value={data?.students}
          hint={`${data?.students_registered ?? 0} registered this semester`}
          icon={GraduationCap}
        />
        <StatCard
          label="Lecturers"
          value={data?.lecturers}
          hint={`${data?.users_by_status?.SUSPENDED ?? 0} suspended accounts`}
          icon={Users}
        />
        <StatCard
          label="Results awaiting review"
          value={sheets?.SUBMITTED}
          hint={`${sheets?.APPROVED ?? 0} approved · ${sheets?.RETURNED ?? 0} returned`}
          icon={ClipboardCheck}
        />
      </div>

      <section className="space-y-3">
        <h2 className="font-semibold">Departments</h2>
        <DataTable
          rows={data?.by_department}
          rowKey={(d) => d.id}
          isLoading={overview.isLoading}
          error={overview.error}
          columns={[
            {
              header: 'Department',
              cell: (d) => (
                <div>
                  <p className="font-medium">{d.name}</p>
                  <p className="text-xs text-muted-foreground">{d.faculty}</p>
                </div>
              ),
            },
            { header: 'Students', cell: (d) => d.students, className: 'text-right' },
            { header: 'Lecturers', cell: (d) => d.lecturers, className: 'text-right' },
            {
              header: 'Courses',
              cell: (d) => d.courses,
              className: 'hidden text-right sm:table-cell',
            },
            {
              header: 'Pending results',
              cell: (d) =>
                d.pending_results ? (
                  <span className="font-semibold text-amber-700">{d.pending_results}</span>
                ) : (
                  0
                ),
              className: 'text-right',
            },
          ]}
        />
      </section>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent activity</CardTitle>
          <Button asChild variant="outline" size="sm">
            <Link to="/admin/audit">Full audit log</Link>
          </Button>
        </CardHeader>
        <CardContent>
          <ul className="divide-y text-sm">
            {activity.data?.results.map((entry) => (
              <li
                key={entry.id}
                className="flex flex-col gap-0.5 py-2 sm:flex-row sm:justify-between"
              >
                <span>{entry.summary}</span>
                <span className="text-xs text-muted-foreground">
                  {entry.actor_name ?? 'System'} · {formatDateTime(entry.created_at)}
                </span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </>
  )
}
