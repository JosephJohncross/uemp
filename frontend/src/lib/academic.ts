import { TERM_LABEL } from './format'
import type { Term } from './types'

export const LEVEL_OPTIONS = [100, 200, 300, 400, 500].map((level) => ({
  value: level,
  label: `${level} level`,
}))

export const TERM_OPTIONS = (Object.keys(TERM_LABEL) as Term[]).map((term) => ({
  value: term,
  label: TERM_LABEL[term],
}))
