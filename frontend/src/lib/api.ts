export type FieldErrors = Record<string, string>

export class ApiError extends Error {
  status: number
  fieldErrors: FieldErrors

  constructor(status: number, body: unknown) {
    const fieldErrors = collectFieldErrors(body)
    super(errorMessage(status, body, fieldErrors))
    this.status = status
    this.fieldErrors = fieldErrors
  }
}

function collectFieldErrors(body: unknown): FieldErrors {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return {}
  const errors: FieldErrors = {}
  for (const [field, value] of Object.entries(body)) {
    if (field === 'detail') continue
    errors[field] = flattenMessages(value).join(' ')
  }
  return errors
}

function flattenMessages(value: unknown): string[] {
  if (typeof value === 'string') return [value]
  if (Array.isArray(value)) return value.flatMap(flattenMessages)
  if (value && typeof value === 'object') return Object.values(value).flatMap(flattenMessages)
  return []
}

function errorMessage(status: number, body: unknown, fieldErrors: FieldErrors): string {
  if (body && typeof body === 'object' && 'detail' in body) return String(body.detail)
  const firstFieldError = Object.values(fieldErrors)[0]
  if (firstFieldError) return firstFieldError
  if (status >= 500) return 'The server ran into a problem. Please try again.'
  return 'Something went wrong. Please try again.'
}

function readCookie(name: string): string {
  const match = document.cookie.split('; ').find((row) => row.startsWith(`${name}=`))
  return match ? decodeURIComponent(match.split('=')[1]) : ''
}

export type QueryParams = Record<string, string | number | boolean | undefined | null>

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: unknown
  params?: QueryParams
}

function apiUrl(path: string, params?: QueryParams) {
  const url = new URL(`/api${path}`, window.location.origin)
  for (const [key, value] of Object.entries(params ?? {})) {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value))
    }
  }
  return url
}

export async function api<T>(path: string, { method = 'GET', body, params }: RequestOptions = {}) {
  const url = apiUrl(path, params)

  const headers: Record<string, string> = { Accept: 'application/json' }
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (method !== 'GET') headers['X-CSRFToken'] = readCookie('csrftoken')

  const response = await fetch(url, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    credentials: 'same-origin',
  })

  if (response.status === 204) return undefined as T
  const data = await response.json().catch(() => null)
  if (!response.ok) throw new ApiError(response.status, data)
  return data as T
}

/** Fetches a file the API generates (a PDF) and saves it under the name the server gives it. */
export async function downloadFile(path: string, params?: QueryParams) {
  const response = await fetch(apiUrl(path, params), { credentials: 'same-origin' })
  if (!response.ok) {
    throw new ApiError(response.status, await response.json().catch(() => null))
  }
  const disposition = response.headers.get('Content-Disposition') ?? ''
  const filename = /filename="([^"]+)"/.exec(disposition)?.[1] ?? 'document.pdf'

  const link = document.createElement('a')
  link.href = URL.createObjectURL(await response.blob())
  link.download = filename
  link.click()
  URL.revokeObjectURL(link.href)
}
