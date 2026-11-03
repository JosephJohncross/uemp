import { CheckCircle2, Printer } from 'lucide-react'
import { useState } from 'react'

import { useCurrentUser } from '@/auth/useAuth'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { DataTable } from '@/components/DataTable'
import { PageHeader } from '@/components/PageHeader'
import { PrintHeader } from '@/components/PrintHeader'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'
import { formatDateTime } from '@/lib/format'
import { useApiMutation, useApiQuery } from '@/lib/queries'
import type { AvailableCourses, MyRegistrations } from '@/lib/types'

export default function CourseRegistrationPage() {
  const user = useCurrentUser()
  const available = useApiQuery<AvailableCourses>('/student/registration/available/')
  const mine = useApiQuery<MyRegistrations>('/student/registration/')
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [confirming, setConfirming] = useState(false)

  const register = useApiMutation(
    (courseIds: number[]) =>
      api('/student/registration/', { method: 'POST', body: { course_ids: courseIds } }),
    { invalidates: ['/student/'], successMessage: 'Courses registered.' },
  )

  const courses = available.data?.courses ?? []
  const selectedCourses = courses.filter((course) => selected.has(course.id))
  const selectedUnits = selectedCourses.reduce((sum, course) => sum + course.units, 0)
  const registeredUnits = available.data?.registered_units ?? 0
  const maxUnits = available.data?.max_units ?? 0
  const isOpen = available.data?.semester.registration_open ?? false
  const overLimit = registeredUnits + selectedUnits > maxUnits

  function toggle(courseId: number) {
    setSelected((current) => {
      const next = new Set(current)
      if (next.has(courseId)) next.delete(courseId)
      else next.add(courseId)
      return next
    })
  }

  async function submit() {
    await register.mutateAsync([...selected])
    setSelected(new Set())
  }

  return (
    <>
      <PrintHeader
        title={`Course registration slip — ${mine.data?.semester.label ?? ''}`}
        user={user}
      />

      <PageHeader
        title="Course registration"
        description={available.data?.semester.label}
        actions={
          <Button
            variant="outline"
            onClick={() => window.print()}
            disabled={!mine.data?.registrations.length}
          >
            <Printer />
            Print registration slip
          </Button>
        }
      />

      <section className="space-y-3 print:hidden">
        {!isOpen && available.data && (
          <Alert>
            <AlertTitle>Registration is closed</AlertTitle>
            <AlertDescription>
              Course registration for {available.data.semester.label} is not open. Contact your
              department if you need to change your courses.
            </AlertDescription>
          </Alert>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold">Courses available to you</h2>
          <p className="text-sm text-muted-foreground">
            Registered {registeredUnits} + selected {selectedUnits} of {maxUnits} units
          </p>
        </div>

        <DataTable
          rows={courses}
          rowKey={(course) => course.id}
          isLoading={available.isLoading}
          error={available.error}
          empty="No courses are offered to your program and level this semester."
          columns={[
            {
              header: <span className="sr-only">Select</span>,
              className: 'w-10',
              cell: (course) =>
                course.registered ? (
                  <CheckCircle2 className="size-4 text-emerald-600" aria-label="Registered" />
                ) : (
                  <input
                    type="checkbox"
                    className="size-4 accent-primary"
                    checked={selected.has(course.id)}
                    onChange={() => toggle(course.id)}
                    disabled={!isOpen}
                    aria-label={`Select ${course.code}`}
                  />
                ),
            },
            {
              header: 'Code',
              cell: (course) => <span className="font-medium">{course.code}</span>,
            },
            { header: 'Title', cell: (course) => course.title },
            {
              header: 'Department',
              cell: (course) => course.department_name,
              className: 'hidden md:table-cell',
            },
            { header: 'Units', cell: (course) => course.units, className: 'text-right' },
            {
              header: 'Status',
              cell: (course) =>
                course.registered ? <Badge variant="secondary">Registered</Badge> : null,
            },
          ]}
        />

        <div className="flex flex-wrap items-center justify-end gap-3">
          {overLimit && (
            <p className="text-sm text-destructive">
              This selection is over the {maxUnits}-unit limit.
            </p>
          )}
          <Button
            disabled={!selected.size || overLimit || !isOpen}
            onClick={() => setConfirming(true)}
          >
            Register {selected.size || ''} course{selected.size === 1 ? '' : 's'}
          </Button>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Registered courses</h2>
          <p className="text-sm text-muted-foreground">
            Total: {mine.data?.total_units ?? 0} units
          </p>
        </div>
        <DataTable
          rows={mine.data?.registrations}
          rowKey={(row) => row.id}
          isLoading={mine.isLoading}
          error={mine.error}
          empty="No courses registered yet."
          columns={[
            {
              header: 'Code',
              cell: (row) => <span className="font-medium">{row.course.code}</span>,
            },
            { header: 'Title', cell: (row) => row.course.title },
            { header: 'Units', cell: (row) => row.course.units, className: 'text-right' },
            {
              header: 'Registered on',
              cell: (row) => formatDateTime(row.registered_at),
              className: 'hidden sm:table-cell',
            },
          ]}
        />
      </section>

      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title="Confirm registration"
        description={`Register ${selectedCourses.map((c) => c.code).join(', ')} (${selectedUnits} units)? Courses can't be removed after registration, so check your selection.`}
        confirmLabel="Register"
        onConfirm={submit}
      />
    </>
  )
}
