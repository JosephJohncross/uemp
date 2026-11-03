import { BookOpen, ClipboardCheck, GraduationCap, Users } from 'lucide-react'
import { Link } from 'react-router'

import { DataTable } from '@/components/DataTable'
import { PageHeader } from '@/components/PageHeader'
import { SheetStatusBreakdown } from '@/components/SheetStatusBreakdown'
import { StatCard } from '@/components/StatCard'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
        eyebrow={data?.semester ?? 'No current semester'}
        title="University overview"
        description={
          data
            ? `${data.faculties} faculties · ${data.departments} departments · ${data.programs} programs · ${data.courses} courses`
            : undefined
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Students"
          value={data?.students}
          hint={`${data?.students_registered ?? 0} registered this semester`}
          icon={GraduationCap}
        />
        <StatCard label="Lecturers" value={data?.lecturers} icon={Users} />
        <StatCard
          label="Course registrations"
          value={data?.registrations}
          hint="This semester"
          icon={BookOpen}
        />
        <StatCard
          label="Results awaiting review"
          value={sheets?.SUBMITTED}
          hint={`${data?.users_by_status?.SUSPENDED ?? 0} suspended accounts`}
          icon={ClipboardCheck}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-5">
        <section className="space-y-3 xl:col-span-3">
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
              {
                header: 'Lecturers',
                cell: (d) => d.lecturers,
                className: 'hidden text-right sm:table-cell',
              },
              {
                header: 'Pending',
                cell: (d) =>
                  d.pending_results ? (
                    <span className="font-medium text-amber-700">{d.pending_results}</span>
                  ) : (
                    <span className="text-muted-foreground">0</span>
                  ),
                className: 'text-right',
              },
            ]}
          />
        </section>

        <Card className="shadow-none xl:col-span-2">
          <CardHeader>
            <CardTitle>Result sheets</CardTitle>
            <CardDescription>All departments, {data?.semester ?? 'this semester'}</CardDescription>
          </CardHeader>
          <CardContent>
            <SheetStatusBreakdown counts={sheets} />
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-none">
        <CardHeader className="flex flex-row items-start justify-between gap-2">
          <div>
            <CardTitle>Recent activity</CardTitle>
            <CardDescription>From the audit log</CardDescription>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link to="/admin/audit">Full audit log</Link>
          </Button>
        </CardHeader>
        <CardContent>
          <ul className="divide-y text-sm">
            {activity.data?.results.map((entry) => (
              <li
                key={entry.id}
                className="flex flex-col gap-0.5 py-2.5 sm:flex-row sm:items-center sm:justify-between"
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
