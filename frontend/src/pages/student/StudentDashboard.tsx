import { BookOpen, ClipboardList, GraduationCap, TrendingUp } from 'lucide-react'
import { Link } from 'react-router'

import { useCurrentUser } from '@/auth/useAuth'
import { DataTable } from '@/components/DataTable'
import { PageHeader } from '@/components/PageHeader'
import { StatCard } from '@/components/StatCard'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useApiQuery } from '@/lib/queries'
import type { MyRegistrations, StudentResults } from '@/lib/types'

export default function StudentDashboard() {
  const user = useCurrentUser()
  const profile = user.student_profile!
  const registration = useApiQuery<MyRegistrations>('/student/registration/')
  const results = useApiQuery<StudentResults>('/student/results/')
  const semester = registration.data?.semester

  return (
    <>
      <PageHeader
        title={`Welcome, ${user.first_name}`}
        description={semester ? `Current semester: ${semester.label}` : undefined}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="CGPA"
          value={results.data?.cgpa}
          hint="Approved results only"
          icon={TrendingUp}
        />
        <StatCard
          label="Units earned"
          value={results.data?.total_units}
          hint={`${results.data?.semesters.length ?? 0} semester(s) of results`}
          icon={GraduationCap}
        />
        <StatCard
          label="Registered this semester"
          value={registration.data?.registrations.length}
          hint={`${registration.data?.total_units ?? 0} units`}
          icon={BookOpen}
        />
        <StatCard
          label="Registration"
          value={semester?.registration_open ? 'Open' : 'Closed'}
          hint={semester?.label}
          icon={ClipboardList}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Academic profile</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-3 text-sm">
              {[
                ['Matric number', profile.matric_number],
                ['Program', profile.program_name],
                ['Department', profile.department_name],
                ['Faculty', profile.faculty_name],
                ['Level', `${profile.level} level`],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd className="font-medium">{value}</dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>

        <div className="space-y-3 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Registered courses</h2>
            <Button asChild variant="outline" size="sm">
              <Link to="/student/registration">
                {registration.data?.registrations.length ? 'View registration' : 'Register courses'}
              </Link>
            </Button>
          </div>
          <DataTable
            rows={registration.data?.registrations}
            rowKey={(row) => row.id}
            isLoading={registration.isLoading}
            error={registration.error}
            empty="You haven't registered any courses this semester."
            columns={[
              {
                header: 'Code',
                cell: (row) => <span className="font-medium">{row.course.code}</span>,
              },
              { header: 'Title', cell: (row) => row.course.title },
              {
                header: 'Units',
                cell: (row) => <Badge variant="outline">{row.course.units}</Badge>,
                className: 'text-right',
              },
            ]}
          />
        </div>
      </div>
    </>
  )
}
