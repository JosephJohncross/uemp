import { Input } from '@/components/ui/input'
import { DataTable } from '@/components/DataTable'
import type { ScoreRow } from '@/lib/types'

import { CA_MAX, EXAM_MAX, type ScoreDraft, type ScoreDrafts } from './scoreDrafts'

interface ScoreTableProps {
  rows: ScoreRow[]
  drafts: ScoreDrafts
  editable: boolean
  onChange: (registration: number, draft: ScoreDraft) => void
}

export function ScoreTable({ rows, drafts, editable, onChange }: ScoreTableProps) {
  function scoreInput(row: ScoreRow, field: keyof ScoreDraft, max: number) {
    const draft = drafts[row.registration]
    return (
      <Input
        type="number"
        inputMode="numeric"
        min={0}
        max={max}
        value={draft[field]}
        onChange={(event) => onChange(row.registration, { ...draft, [field]: event.target.value })}
        className="ml-auto h-8 w-20 text-right tabular-nums"
        aria-label={`${field === 'ca' ? 'CA' : 'Exam'} score for ${row.matric_number}`}
      />
    )
  }

  function liveTotal(row: ScoreRow) {
    if (!editable) return row.total ?? '—'
    const { ca, exam } = drafts[row.registration]
    if (ca === '' || exam === '') return '—'
    return Number(ca) + Number(exam)
  }

  return (
    <DataTable
      rows={rows}
      rowKey={(row) => row.registration}
      empty="No students are registered for this course yet."
      columns={[
        {
          header: 'Student',
          cell: (row) => (
            <div>
              <p className="font-medium">{row.student_name}</p>
              <p className="text-xs text-muted-foreground">{row.matric_number}</p>
            </div>
          ),
        },
        {
          header: 'Program',
          cell: (row) => `${row.program_name} · ${row.level}L`,
          className: 'hidden lg:table-cell',
        },
        {
          header: `CA /${CA_MAX}`,
          cell: (row) => (editable ? scoreInput(row, 'ca', CA_MAX) : (row.ca_score ?? '—')),
          className: 'text-right',
        },
        {
          header: `Exam /${EXAM_MAX}`,
          cell: (row) => (editable ? scoreInput(row, 'exam', EXAM_MAX) : (row.exam_score ?? '—')),
          className: 'text-right',
        },
        {
          header: 'Total',
          cell: (row) => <span className="tabular-nums">{liveTotal(row)}</span>,
          className: 'text-right',
        },
        {
          header: 'Grade',
          cell: (row) => <span className="font-semibold">{row.grade || '—'}</span>,
          className: 'text-center',
        },
      ]}
    />
  )
}
