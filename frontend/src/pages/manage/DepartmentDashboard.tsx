import { BookOpen, ClipboardList, GraduationCap, Users } from 'lucide-react'
import { Link } from 'react-router'

import { useCurrentUser } from '@/auth/useAuth'
import { PageHeader } from '@/components/PageHeader'
import { SheetStatusBreakdown } from '@/components/SheetStatusBreakdown'
import { StatCard } from '@/components/StatCard'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDateTime } from '@/lib/format'
import { useApiQuery } from '@/lib/queries'
import type { Overview, Paginated, ResultSheet } from '@/lib/types'

export default function DepartmentDashboard() {
  const user = useCurrentUser()
  const overview = useApiQuery<Overview>('/reports/overview/')
  const pending = useApiQuery<Paginated<ResultSheet>>('/result-sheets/', { status: 'SUBMITTED' })
  const data = overview.data
  const pendingSheets = pending.data?.results ?? []

  return (
    <>
      <PageHeader
        eyebrow={data?.semester ?? undefined}
        title={user.staff_profile?.department_name ?? 'Department'}
        description="Department overview"
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

      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="shadow-none lg:col-span-3">
          <CardHeader className="flex flex-row items-start justify-between gap-2">
            <div>
              <CardTitle>Waiting for your review</CardTitle>
              <CardDescription>
                {pendingSheets.length} result sheet{pendingSheets.length === 1 ? '' : 's'} submitted
                by lecturers
              </CardDescription>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link to="/department/results">All sheets</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {pending.isLoading && <Skeleton className="h-32 w-full" />}
            {!pending.isLoading && !pendingSheets.length && (
              <p className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
                Nothing to review right now.
              </p>
            )}
            <ul className="divide-y">
              {pendingSheets.map((sheet) => (
                <li key={sheet.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {sheet.course.code} · {sheet.course.title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {sheet.submitted_by_name} · {formatDateTime(sheet.submitted_at)}
                    </p>
                  </div>
                  <Button asChild size="sm">
                    <Link to={`/department/results/${sheet.id}`}>Review</Link>
                  </Button>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card className="shadow-none lg:col-span-2">
          <CardHeader>
            <CardTitle>Result sheets</CardTitle>
            <CardDescription>{data?.semester}</CardDescription>
          </CardHeader>
          <CardContent>
            <SheetStatusBreakdown counts={data?.result_sheets} />
          </CardContent>
        </Card>
      </div>
    </>
  )
}
