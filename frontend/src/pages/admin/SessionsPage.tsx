import { Plus } from 'lucide-react'
import { useState } from 'react'

import { ConfirmDialog } from '@/components/ConfirmDialog'
import { FormDialog, type FormValues } from '@/components/FormDialog'
import { PageHeader } from '@/components/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { TERM_OPTIONS } from '@/lib/academic'
import { api } from '@/lib/api'
import { formatDate, TERM_LABEL } from '@/lib/format'
import { useApiMutation, useApiQuery } from '@/lib/queries'
import type { AcademicSession, Paginated, Semester } from '@/lib/types'

type PendingAction =
  | { kind: 'set-current'; semester: Semester }
  | { kind: 'registration'; semester: Semester; open: boolean }

export default function SessionsPage() {
  const { data, isLoading, error } = useApiQuery<Paginated<AcademicSession>>('/sessions/')
  const [creatingSession, setCreatingSession] = useState(false)
  const [addingSemesterTo, setAddingSemesterTo] = useState<AcademicSession | null>(null)
  const [pending, setPending] = useState<PendingAction | null>(null)
  const invalidates = ['/sessions/', '/semesters/', '/reports/', '/allocations/', '/student/']

  const createSession = useApiMutation(
    (values: FormValues) =>
      api('/sessions/', {
        method: 'POST',
        body: { name: values.name, start_date: values.start_date, end_date: values.end_date },
      }),
    { invalidates, successMessage: 'Session created.', showsFieldErrors: true },
  )

  const createSemester = useApiMutation(
    (values: FormValues) =>
      api('/semesters/', {
        method: 'POST',
        body: { session: addingSemesterTo!.id, term: values.term },
      }),
    { invalidates, successMessage: 'Semester added.', showsFieldErrors: true },
  )

  const runAction = useApiMutation(
    (action: PendingAction) =>
      action.kind === 'set-current'
        ? api(`/semesters/${action.semester.id}/set-current/`, { method: 'POST' })
        : api(`/semesters/${action.semester.id}/registration/`, {
            method: 'POST',
            body: { open: action.open },
          }),
    { invalidates, successMessage: 'Semester updated.' },
  )

  return (
    <>
      <PageHeader
        title="Sessions & semesters"
        description="Exactly one semester is current at a time. Registration and result entry follow it."
        actions={
          <Button onClick={() => setCreatingSession(true)}>
            <Plus />
            New session
          </Button>
        }
      />

      {isLoading && <Skeleton className="h-40 w-full" />}
      {error && <p className="text-destructive">{error.message}</p>}

      <div className="grid gap-4 lg:grid-cols-2">
        {data?.results.map((session) => (
          <Card key={session.id}>
            <CardHeader className="flex flex-row items-start justify-between">
              <div>
                <CardTitle>{session.name}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {formatDate(session.start_date)} – {formatDate(session.end_date)}
                </p>
              </div>
              {session.semesters.length < 2 && (
                <Button size="sm" variant="outline" onClick={() => setAddingSemesterTo(session)}>
                  Add semester
                </Button>
              )}
            </CardHeader>
            <CardContent className="space-y-3">
              {!session.semesters.length && (
                <p className="text-sm text-muted-foreground">No semesters yet.</p>
              )}
              {session.semesters.map((semester) => (
                <div
                  key={semester.id}
                  className="flex flex-col gap-2 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{TERM_LABEL[semester.term]}</span>
                    {semester.is_current && <Badge>Current</Badge>}
                    {semester.registration_open && (
                      <Badge variant="secondary">Registration open</Badge>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {semester.is_current ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          setPending({
                            kind: 'registration',
                            semester,
                            open: !semester.registration_open,
                          })
                        }
                      >
                        {semester.registration_open ? 'Close registration' : 'Open registration'}
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setPending({ kind: 'set-current', semester })}
                      >
                        Make current
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>

      <FormDialog
        open={creatingSession}
        onOpenChange={setCreatingSession}
        title="New academic session"
        fields={[
          { name: 'name', label: 'Name', required: true, wide: true, placeholder: '2026/2027' },
          { name: 'start_date', label: 'Starts', type: 'date', required: true },
          { name: 'end_date', label: 'Ends', type: 'date', required: true },
        ]}
        onSubmit={createSession.mutateAsync}
      />

      <FormDialog
        open={Boolean(addingSemesterTo)}
        onOpenChange={(open) => !open && setAddingSemesterTo(null)}
        title={`Add a semester to ${addingSemesterTo?.name ?? ''}`}
        fields={[
          {
            name: 'term',
            label: 'Semester',
            type: 'select',
            wide: true,
            options: TERM_OPTIONS.filter(
              (option) => !addingSemesterTo?.semesters.some((s) => s.term === option.value),
            ),
          },
        ]}
        onSubmit={createSemester.mutateAsync}
      />

      {pending && (
        <ConfirmDialog
          open
          onOpenChange={(open) => !open && setPending(null)}
          title={
            pending.kind === 'set-current'
              ? `Make ${pending.semester.label} current?`
              : `${pending.open ? 'Open' : 'Close'} registration?`
          }
          description={
            pending.kind === 'set-current'
              ? 'The previous current semester stops being current and its registration closes. New allocations, registrations and results will use this semester.'
              : pending.open
                ? `Students can register courses for ${pending.semester.label}.`
                : `Students can no longer register courses for ${pending.semester.label}.`
          }
          confirmLabel="Confirm"
          onConfirm={() => runAction.mutateAsync(pending)}
        />
      )}
    </>
  )
}
