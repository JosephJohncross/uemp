import type { ScoreRow } from '@/lib/types'

// Mirrors CA_MAX_SCORE / EXAM_MAX_SCORE on the server, which is what actually enforces them.
export const CA_MAX = 30
export const EXAM_MAX = 70

export interface ScoreDraft {
  ca: string
  exam: string
}

export type ScoreDrafts = Record<number, ScoreDraft>

export function draftsFromRows(rows: ScoreRow[]): ScoreDrafts {
  return Object.fromEntries(
    rows.map((row) => [
      row.registration,
      { ca: row.ca_score?.toString() ?? '', exam: row.exam_score?.toString() ?? '' },
    ]),
  )
}

export function toNumberOrNull(value: string) {
  return value === '' ? null : Number(value)
}
