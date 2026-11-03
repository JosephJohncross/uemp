import { useMutation, useQuery, useQueryClient, type QueryKey } from '@tanstack/react-query'
import { toast } from 'sonner'

import { api, type ApiError, type QueryParams } from './api'
import type { Paginated } from './types'

export function useApiQuery<T>(path: string, params?: QueryParams, enabled = true) {
  return useQuery<T, ApiError>({
    queryKey: [path, params ?? {}],
    queryFn: () => api<T>(path, { params }),
    enabled,
  })
}

/** Small lookup lists (departments, programs, lecturers) used to fill select inputs. */
export function useOptions<T>(path: string, params?: QueryParams, enabled = true) {
  const query = useApiQuery<Paginated<T>>(path, { page_size: 200, ...params }, enabled)
  return query.data?.results ?? []
}

interface MutationOptions {
  /** API path prefixes whose cached queries should refetch afterwards. */
  invalidates?: string[]
  successMessage?: string
}

export function useApiMutation<TVariables = void, TResult = unknown>(
  request: (variables: TVariables) => Promise<TResult>,
  { invalidates = [], successMessage }: MutationOptions = {},
) {
  const queryClient = useQueryClient()
  return useMutation<TResult, ApiError, TVariables>({
    mutationFn: request,
    onSuccess: () => {
      queryClient.invalidateQueries({
        predicate: ({ queryKey }) => matchesAnyPrefix(queryKey, invalidates),
      })
      if (successMessage) toast.success(successMessage)
    },
    onError: (error) => toast.error(error.message),
  })
}

function matchesAnyPrefix(queryKey: QueryKey, prefixes: string[]) {
  const [path] = queryKey
  return typeof path === 'string' && prefixes.some((prefix) => path.startsWith(prefix))
}
