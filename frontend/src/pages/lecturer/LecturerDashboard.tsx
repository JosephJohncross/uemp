import { ArrowRight, Users } from 'lucide-react'
import { Link } from 'react-router'

import { useCurrentUser } from '@/auth/useAuth'
import { PageHeader } from '@/components/PageHeader'
import { StatCard } from '@/components/StatCard'
import { StatusBadge } from '@/components/StatusBadge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useApiQuery } from '@/lib/queries'
import type { Allocation, Paginated } from '@/lib/types'

export default function LecturerDashboard() {
  const user = useCurrentUser()
  const { data, isLoading, error } = useApiQuery<Paginated<Allocation>>('/allocations/')
  const allocations = data?.results ?? []
  const count = (status: string) => allocations.filter((a) => a.result_status === status).length

  return (
    <>
      <PageHeader
        title="My courses"
        description={
          allocations[0]
            ? `${allocations[0].semester_label} · ${user.staff_profile?.department_name}`
            : user.staff_profile?.department_name
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Courses this semester" value={allocations.length} />
        <StatCard
          label="Students taught"
          value={allocations.reduce((sum, a) => sum + a.registered_count, 0)}
        />
        <StatCard label="Results to enter" value={count('DRAFT') + count('RETURNED')} />
        <StatCard label="Awaiting review" value={count('SUBMITTED')} />
      </div>

      {error && <p className="text-destructive">{error.message}</p>}
      {isLoading && <Skeleton className="h-40 w-full" />}
      {data && !allocations.length && (
        <p className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
          No courses have been allocated to you this semester.
        </p>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {allocations.map((allocation) => {
          const course = allocation.course_detail
          return (
            <Card key={allocation.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <CardTitle>{course.code}</CardTitle>
                    <p className="text-sm text-muted-foreground">{course.title}</p>
                  </div>
                  <StatusBadge status={allocation.result_status} />
                </div>
              </CardHeader>
              <CardContent className="flex gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Users className="size-4" />
                  {allocation.registered_count} students
                </span>
                <span>{course.units} units</span>
                <span>{course.level} level</span>
              </CardContent>
              <CardFooter>
                {allocation.result_sheet && (
                  <Button asChild variant="outline" className="w-full">
                    <Link to={`/lecturer/results/${allocation.result_sheet}`}>
                      Class list & results
                      <ArrowRight />
                    </Link>
                  </Button>
                )}
              </CardFooter>
            </Card>
          )
        })}
      </div>
    </>
  )
}
