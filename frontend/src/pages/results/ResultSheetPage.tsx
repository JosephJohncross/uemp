import {
  ArrowLeft,
  Check,
  CircleCheck,
  Printer,
  RotateCcw,
  Save,
  Send,
  TrendingUp,
  Undo2,
  Users,
} from 'lucide-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router'

import { useCurrentUser } from '@/auth/useAuth'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { PageHeader } from '@/components/PageHeader'
import { GradeDistribution } from '@/components/GradeDistribution'
import { ProgressBar } from '@/components/ProgressBar'
import { StatCard } from '@/components/StatCard'
import { StatusBadge } from '@/components/StatusBadge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { api } from '@/lib/api'
import { formatDateTime } from '@/lib/format'
import { useApiMutation, useApiQuery } from '@/lib/queries'
import { ROLE_HOME } from '@/lib/roles'
import type { ResultSheetDetail, Role } from '@/lib/types'

import { ScoreTable } from './ScoreTable'
import { draftsFromRows, toNumberOrNull, type ScoreDraft, type ScoreDrafts } from './scoreDrafts'

type ReviewAction = 'submit' | 'approve' | 'reject' | 'reopen'

const REVIEW_DIALOGS: Record<
  ReviewAction,
  {
    title: string
    description: string
    confirmLabel: string
    comment?: { label: string; required?: boolean }
    destructive?: boolean
  }
> = {
  submit: {
    title: 'Submit results for review',
    description:
      'Once submitted, you cannot change these scores unless the department returns the sheet.',
    confirmLabel: 'Submit',
  },
  approve: {
    title: 'Approve results',
    description: 'Approved results become visible to students immediately.',
    confirmLabel: 'Approve',
    comment: { label: 'Comment (optional)' },
  },
  reject: {
    title: 'Return results for correction',
    description: 'The lecturer will see your comment and can correct and resubmit the sheet.',
    confirmLabel: 'Return to lecturer',
    comment: { label: 'What needs correcting?', required: true },
    destructive: true,
  },
  reopen: {
    title: 'Reopen approved results',
    description:
      'Students will stop seeing these results until the corrected sheet is approved again.',
    confirmLabel: 'Reopen',
    comment: { label: 'Reason for reopening', required: true },
    destructive: true,
  },
}

export default function ResultSheetPage() {
  const { sheetId } = useParams()
  const user = useCurrentUser()
  const path = `/result-sheets/${sheetId}/`
  const { data: sheet, isLoading, error } = useApiQuery<ResultSheetDetail>(path)

  if (isLoading) return <Skeleton className="h-96 w-full" />
  if (error || !sheet) return <p className="text-destructive">{error?.message}</p>

  // Remount when the sheet changes on the server so the score inputs start from saved values.
  return <ResultSheetView key={`${sheet.id}-${sheet.updated_at}`} sheet={sheet} role={user.role} />
}

function ResultSheetView({ sheet, role }: { sheet: ResultSheetDetail; role: Role }) {
  const path = `/result-sheets/${sheet.id}/`
  const [drafts, setDrafts] = useState<ScoreDrafts>(() => draftsFromRows(sheet.rows))
  const [dialog, setDialog] = useState<ReviewAction | null>(null)

  const isLecturer = role === 'LECTURER'
  const isReviewer = role === 'DEPT_ADMIN'
  const editable = isLecturer && (sheet.status === 'DRAFT' || sheet.status === 'RETURNED')
  const changedRows = sheet.rows.filter((row) => {
    const draft = drafts[row.registration]
    return (
      toNumberOrNull(draft.ca) !== row.ca_score || toNumberOrNull(draft.exam) !== row.exam_score
    )
  })
  const invalidates = [path, '/result-sheets/', '/allocations/', '/reports/']

  const saveScores = useApiMutation(
    () =>
      api(`${path}scores/`, {
        method: 'PUT',
        body: {
          scores: changedRows.map((row) => ({
            registration: row.registration,
            ca_score: toNumberOrNull(drafts[row.registration].ca),
            exam_score: toNumberOrNull(drafts[row.registration].exam),
          })),
        },
      }),
    { invalidates, successMessage: 'Scores saved as draft.' },
  )

  const review = useApiMutation(
    ({ action, comment }: { action: ReviewAction; comment: string }) =>
      api(`${path}${action}/`, {
        method: 'POST',
        body: action === 'submit' ? undefined : { comment },
      }),
    { invalidates, successMessage: 'Result sheet updated.' },
  )

  function updateDraft(registration: number, draft: ScoreDraft) {
    setDrafts((current) => ({ ...current, [registration]: draft }))
  }

  const dialogConfig = dialog ? REVIEW_DIALOGS[dialog] : null
  const summary = sheet.summary

  return (
    <>
      <Button asChild variant="ghost" size="sm" className="-ml-2 print:hidden">
        <Link to={isLecturer ? ROLE_HOME.LECTURER : `${ROLE_HOME[role]}/results`}>
          <ArrowLeft />
          Back
        </Link>
      </Button>

      <PageHeader
        title={`${sheet.course.code} — ${sheet.course.title}`}
        description={
          <span className="flex flex-wrap items-center gap-2">
            {sheet.semester_label} · {sheet.course.units} units ·{' '}
            {sheet.lecturer_name ?? 'No lecturer'}
            <StatusBadge status={sheet.status} />
          </span>
        }
        actions={
          <>
            <Button variant="outline" onClick={() => window.print()}>
              <Printer />
              Print class list
            </Button>
            {editable && (
              <>
                <Button
                  variant="outline"
                  disabled={!changedRows.length || saveScores.isPending}
                  onClick={() => saveScores.mutate()}
                >
                  <Save />
                  Save draft
                </Button>
                <Button
                  disabled={changedRows.length > 0 || !sheet.rows.length}
                  onClick={() => setDialog('submit')}
                >
                  <Send />
                  Submit for review
                </Button>
              </>
            )}
            {isReviewer && sheet.status === 'SUBMITTED' && (
              <>
                <Button variant="outline" onClick={() => setDialog('reject')}>
                  <Undo2 />
                  Return
                </Button>
                <Button onClick={() => setDialog('approve')}>
                  <Check />
                  Approve
                </Button>
              </>
            )}
            {isReviewer && sheet.status === 'APPROVED' && (
              <Button variant="outline" onClick={() => setDialog('reopen')}>
                <RotateCcw />
                Reopen
              </Button>
            )}
          </>
        }
      />

      <SheetStatusNotice
        sheet={sheet}
        isLecturer={isLecturer}
        hasUnsavedChanges={changedRows.length > 0}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Graded"
          value={`${summary.graded} / ${summary.registered}`}
          hint={<ProgressBar value={summary.graded} max={summary.registered} className="mt-2" />}
          icon={Users}
        />
        <StatCard
          label="Class average"
          value={summary.average}
          decimals={1}
          hint={
            summary.highest !== null ? `High ${summary.highest} · Low ${summary.lowest}` : undefined
          }
          icon={TrendingUp}
        />
        <StatCard
          label="Pass rate"
          value={summary.graded ? `${Math.round((100 * summary.passed) / summary.graded)}%` : null}
          hint={`${summary.passed} of ${summary.graded} passed`}
          icon={CircleCheck}
        />
        <Card className="gap-2 p-5 shadow-xs">
          <p className="text-sm font-medium text-muted-foreground">Grade distribution</p>
          <GradeDistribution counts={summary.grade_distribution} />
        </Card>
      </div>

      <ScoreTable rows={sheet.rows} drafts={drafts} editable={editable} onChange={updateDraft} />

      <Card>
        <CardHeader>
          <CardTitle>History</CardTitle>
        </CardHeader>
        <CardContent>
          {sheet.history.length ? (
            <ol className="relative space-y-4 border-l pl-5">
              {sheet.history.map((entry) => (
                <li key={entry.id} className="relative text-sm">
                  <span className="absolute top-1.5 -left-[1.6rem] size-2.5 rounded-full bg-primary ring-4 ring-card" />
                  <p className="font-medium">{entry.summary}</p>
                  <p className="text-xs text-muted-foreground">
                    {entry.actor_name ?? 'System'} · {formatDateTime(entry.created_at)}
                  </p>
                  {typeof entry.details.comment === 'string' && entry.details.comment && (
                    <p className="mt-1.5 rounded-md bg-muted px-3 py-2 text-muted-foreground italic">
                      “{entry.details.comment}”
                    </p>
                  )}
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-muted-foreground">No activity yet.</p>
          )}
        </CardContent>
      </Card>

      {dialog && dialogConfig && (
        <ConfirmDialog
          open
          onOpenChange={(open) => !open && setDialog(null)}
          {...dialogConfig}
          onConfirm={(comment) => review.mutateAsync({ action: dialog, comment })}
        />
      )}
    </>
  )
}

interface SheetStatusNoticeProps {
  sheet: ResultSheetDetail
  isLecturer: boolean
  hasUnsavedChanges: boolean
}

function SheetStatusNotice({ sheet, isLecturer, hasUnsavedChanges }: SheetStatusNoticeProps) {
  if (sheet.status === 'RETURNED') {
    return (
      <Alert variant="destructive">
        <AlertTitle>Returned for correction by {sheet.reviewed_by_name}</AlertTitle>
        <AlertDescription>{sheet.review_comment}</AlertDescription>
      </Alert>
    )
  }
  if (sheet.status === 'SUBMITTED') {
    return (
      <Alert className="border-amber-200 bg-amber-50 text-amber-900">
        <AlertTitle>Awaiting departmental review</AlertTitle>
        <AlertDescription>
          Submitted by {sheet.submitted_by_name} on {formatDateTime(sheet.submitted_at)}.
          {isLecturer && ' Scores are locked until the department responds.'}
        </AlertDescription>
      </Alert>
    )
  }
  if (sheet.status === 'APPROVED') {
    return (
      <Alert className="border-emerald-200 bg-emerald-50 text-emerald-900">
        <AlertTitle>Approved</AlertTitle>
        <AlertDescription>
          Approved by {sheet.reviewed_by_name} on {formatDateTime(sheet.reviewed_at)}. Students can
          see these results.
        </AlertDescription>
      </Alert>
    )
  }
  if (isLecturer && hasUnsavedChanges) {
    return (
      <Alert>
        <AlertTitle>Unsaved changes</AlertTitle>
        <AlertDescription>Save your draft before submitting the sheet for review.</AlertDescription>
      </Alert>
    )
  }
  return null
}
