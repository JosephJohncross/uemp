import { ArrowRight, BookOpen, ClipboardCheck, PenLine, Users } from 'lucide-react'
import { Link } from 'react-router'

import { useCurrentUser } from '@/auth/useAuth'
import { PageHeader } from '@/components/PageHeader'
import { StatCard } from '@/components/StatCard'
import { StatusBadge } from '@/components/StatusBadge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useApiQuery } from '@/lib/queries'
import type { Allocation, Paginated, SheetStatus } from '@/lib/types'

const NEXT_STEP: Record<SheetStatus, string> = {
  DRAFT: 'Enter scores',
  RETURNED: 'Make corrections',
  SUBMITTED: 'View submission',
  APPROVED: 'View results',
}

export default function LecturerDashboard() {
  const user = useCurrentUser()
  const { data, isLoading, error } = useApiQuery<Paginated<Allocation>>('/allocations/')
  const allocations = data?.results ?? []
  const count = (...statuses: SheetStatus[]) =>
    allocations.filter((a) => a.result_status && statuses.includes(a.result_status)).length

  return (
    <>
      <PageHeader
        eyebrow={allocations[0]?.semester_label}
        title="My courses"
        description={user.staff_profile?.department_name}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Courses" value={allocations.length} icon={BookOpen} />
        <StatCard
          label="Students taught"
          value={allocations.reduce((sum, a) => sum + a.registered_count, 0)}
          icon={Users}
        />
        <StatCard
          label="Results to enter"
          value={count('DRAFT', 'RETURNED')}
          hint={count('RETURNED') ? `${count('RETURNED')} returned for correction` : undefined}
          icon={PenLine}
        />
        <StatCard
          label="Awaiting review"
          value={count('SUBMITTED')}
          hint={`${count('APPROVED')} approved`}
          icon={ClipboardCheck}
        />
      </div>

      {error && <p className="text-destructive">{error.message}</p>}
      {isLoading && <Skeleton className="h-40 w-full" />}
      {data && !allocations.length && (
        <p className="rounded-lg border border-dashed bg-card p-10 text-center text-muted-foreground">
          No courses have been allocated to you this semester.
        </p>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {allocations.map((allocation) => {
          const course = allocation.course_detail
          const status = allocation.result_status
          return (
            <Card key={allocation.id} className="gap-4 p-5 shadow-none">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold">{course.code}</p>
                  <p className="text-sm text-muted-foreground">{course.title}</p>
                </div>
                <StatusBadge status={status} />
              </div>
              <p className="text-sm text-muted-foreground">
                {allocation.registered_count} students · {course.units} units · {course.level} level
              </p>
              {allocation.result_sheet && (
                <Button
                  asChild
                  variant={status === 'DRAFT' || status === 'RETURNED' ? 'default' : 'outline'}
                  className="w-full"
                >
                  <Link to={`/lecturer/results/${allocation.result_sheet}`}>
                    {status ? NEXT_STEP[status] : 'Open class list'}
                    <ArrowRight />
                  </Link>
                </Button>
              )}
            </Card>
          )
        })}
      </div>
    </>
  )
}
