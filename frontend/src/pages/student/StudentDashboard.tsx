import { ArrowRight, BookOpen, ClipboardList, GraduationCap, TrendingUp } from 'lucide-react'
import { Link } from 'react-router'

import { useCurrentUser } from '@/auth/useAuth'
import { GpaTrend } from '@/components/GpaTrend'
import { PageHeader } from '@/components/PageHeader'
import { StatCard } from '@/components/StatCard'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { classOfDegree } from '@/lib/classOfDegree'
import { useApiQuery } from '@/lib/queries'
import type { MyRegistrations, StudentResults } from '@/lib/types'

export default function StudentDashboard() {
  const user = useCurrentUser()
  const profile = user.student_profile!
  const registration = useApiQuery<MyRegistrations>('/student/registration/')
  const results = useApiQuery<StudentResults>('/student/results/')
  const semester = registration.data?.semester
  const registrations = registration.data?.registrations ?? []
  const hasResults = Boolean(results.data?.semesters.length)

  return (
    <>
      <PageHeader
        eyebrow={semester?.label}
        title={`Welcome, ${user.first_name}`}
        description={`${profile.matric_number} · ${profile.program_name} · ${profile.level} level`}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="CGPA"
          value={results.data ? Number(results.data.cgpa) : undefined}
          decimals={2}
          hint={hasResults ? classOfDegree(Number(results.data!.cgpa)) : 'No approved results yet'}
          icon={TrendingUp}
        />
        <StatCard
          label="Units earned"
          value={results.data?.total_units}
          hint={`${results.data?.semesters.length ?? 0} semester(s) of results`}
          icon={GraduationCap}
        />
        <StatCard
          label="Courses this semester"
          value={registrations.length}
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

      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="shadow-none lg:col-span-3">
          <CardHeader className="flex flex-row items-start justify-between gap-2">
            <div>
              <CardTitle>Registered courses</CardTitle>
              <CardDescription>{semester?.label}</CardDescription>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link to="/student/registration">
                {registrations.length ? 'Manage' : 'Register courses'}
                <ArrowRight />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {registration.isLoading && <Skeleton className="h-32 w-full" />}
            {!registration.isLoading && !registrations.length && (
              <p className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
                You haven't registered any courses this semester.
              </p>
            )}
            <ul className="divide-y">
              {registrations.map((row) => (
                <li key={row.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {row.course.code} · {row.course.title}
                    </p>
                    <p className="text-xs text-muted-foreground">{row.course.department_name}</p>
                  </div>
                  <span className="shrink-0 text-sm text-muted-foreground tabular-nums">
                    {row.course.units} units
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card className="shadow-none lg:col-span-2">
          <CardHeader className="flex flex-row items-start justify-between gap-2">
            <div>
              <CardTitle>GPA by semester</CardTitle>
              <CardDescription>Approved results, 5.00 scale</CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link to="/student/results">Details</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {results.isLoading ? (
              <Skeleton className="h-40 w-full" />
            ) : (
              <GpaTrend semesters={results.data?.semesters ?? []} />
            )}
          </CardContent>
        </Card>
      </div>
    </>
  )
}
