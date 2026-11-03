import { useState } from 'react'

import { useCurrentUser } from '@/auth/useAuth'
import { DataTable } from '@/components/DataTable'
import { FilterSelect } from '@/components/FilterSelect'
import { FormDialog, type FormValues } from '@/components/FormDialog'
import { PageHeader } from '@/components/PageHeader'
import { StatusBadge } from '@/components/StatusBadge'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'
import { useApiMutation, useApiQuery, useOptions } from '@/lib/queries'
import type { Allocation, Course, Department, Paginated, Semester, Staff } from '@/lib/types'

interface CourseRow {
  course: Course
  allocation: Allocation | undefined
}

export default function AllocationsPage() {
  const user = useCurrentUser()
  const isSuperAdmin = user.role === 'SUPER_ADMIN'
  const [department, setDepartment] = useState('')
  const [assigning, setAssigning] = useState<CourseRow | null>(null)

  const departments = useOptions<Department>('/departments/', {}, isSuperAdmin)
  const current = useApiQuery<Semester>('/semesters/current/')
  const semester = current.data
  const courses = useApiQuery<Paginated<Course>>(
    '/courses/',
    { term: semester?.term, department, page_size: 200 },
    Boolean(semester),
  )
  const allocations = useApiQuery<Paginated<Allocation>>('/allocations/', { page_size: 200 })
  const lecturers = useOptions<Staff>('/staff/', { role: 'LECTURER' })

  const allocationByCourse = new Map(allocations.data?.results.map((a) => [a.course, a]))
  const rows: CourseRow[] = (courses.data?.results ?? [])
    .filter((course) => course.is_active)
    .map((course) => ({ course, allocation: allocationByCourse.get(course.id) }))

  const allocate = useApiMutation(
    (values: FormValues) =>
      api('/allocations/', {
        method: 'POST',
        body: { course: assigning!.course.id, lecturer: Number(values.lecturer) },
      }),
    {
      invalidates: ['/allocations/', '/result-sheets/', '/reports/'],
      successMessage: 'Lecturer assigned.',
      showsFieldErrors: true,
    },
  )

  const lecturerOptions = assigning
    ? lecturers
        .filter((l) => l.department === assigning.course.department && l.status === 'ACTIVE')
        .map((l) => ({ value: l.id, label: `${l.title} ${l.first_name} ${l.last_name}`.trim() }))
    : []

  return (
    <>
      <PageHeader
        title="Course allocation"
        description={
          semester
            ? `Assign a lecturer to each course offered in ${semester.label}.`
            : 'No current semester has been set.'
        }
      />

      {isSuperAdmin && (
        <FilterSelect
          value={department}
          onChange={setDepartment}
          options={departments.map((d) => ({ value: d.id, label: d.name }))}
          allLabel="All departments"
        />
      )}

      <DataTable
        rows={rows}
        rowKey={(row) => row.course.id}
        isLoading={courses.isLoading || allocations.isLoading}
        error={current.error ?? courses.error ?? allocations.error}
        empty="No active courses run this semester."
        columns={[
          {
            header: 'Course',
            cell: ({ course }) => (
              <div>
                <p className="font-medium">{course.code}</p>
                <p className="text-xs text-muted-foreground">{course.title}</p>
              </div>
            ),
          },
          { header: 'Level', cell: ({ course }) => course.level, className: 'text-right' },
          {
            header: 'Department',
            cell: ({ course }) => course.department_name,
            className: isSuperAdmin ? 'hidden md:table-cell' : 'hidden',
          },
          {
            header: 'Lecturer',
            cell: ({ allocation }) =>
              allocation ? (
                allocation.lecturer_name
              ) : (
                <span className="text-muted-foreground">Not assigned</span>
              ),
          },
          {
            header: 'Students',
            cell: ({ allocation }) => allocation?.registered_count ?? '—',
            className: 'hidden text-right sm:table-cell',
          },
          {
            header: 'Results',
            cell: ({ allocation }) => <StatusBadge status={allocation?.result_status ?? null} />,
            className: 'hidden sm:table-cell',
          },
          {
            header: <span className="sr-only">Actions</span>,
            cell: (row) => (
              <Button
                size="sm"
                variant={row.allocation ? 'outline' : 'default'}
                onClick={() => setAssigning(row)}
              >
                {row.allocation ? 'Change' : 'Assign'}
              </Button>
            ),
            className: 'text-right',
          },
        ]}
      />

      <FormDialog
        open={Boolean(assigning)}
        onOpenChange={(open) => !open && setAssigning(null)}
        title={`Assign a lecturer to ${assigning?.course.code ?? ''}`}
        description="Only lecturers from the department that owns the course can teach it. Reassigning keeps any scores already entered."
        fields={[
          {
            name: 'lecturer',
            label: 'Lecturer',
            type: 'select',
            wide: true,
            options: lecturerOptions,
          },
        ]}
        initialValues={
          assigning?.allocation ? { lecturer: String(assigning.allocation.lecturer) } : {}
        }
        submitLabel="Assign"
        onSubmit={allocate.mutateAsync}
      />
    </>
  )
}
