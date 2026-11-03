import type { Term } from './types'

const dateTime = new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' })
const dateOnly = new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium' })

export function formatDateTime(value: string | null) {
  return value ? dateTime.format(new Date(value)) : '—'
}

export function formatDate(value: string | null) {
  return value ? dateOnly.format(new Date(value)) : '—'
}

export const TERM_LABEL: Record<Term, string> = {
  FIRST: 'First semester',
  SECOND: 'Second semester',
}

export function greeting(now = new Date()) {
  const hour = now.getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}
