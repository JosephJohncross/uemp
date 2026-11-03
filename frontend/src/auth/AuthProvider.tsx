import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useMemo, type ReactNode } from 'react'

import { api, ApiError } from '@/lib/api'
import type { Me } from '@/lib/types'

import { AuthContext } from './AuthContext'

const ME_KEY = ['auth', 'me']

async function fetchCurrentUser(): Promise<Me | null> {
  // Sets the CSRF cookie the login form needs, before anyone is signed in.
  await api('/auth/csrf/')
  try {
    return await api<Me>('/auth/me/')
  } catch (error) {
    if (error instanceof ApiError && (error.status === 401 || error.status === 403)) return null
    throw error
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const { data: user = null, isLoading } = useQuery({
    queryKey: ME_KEY,
    queryFn: fetchCurrentUser,
    staleTime: Infinity,
  })

  const login = useCallback(
    async (email: string, password: string) => {
      const me = await api<Me>('/auth/login/', { method: 'POST', body: { email, password } })
      queryClient.setQueryData(ME_KEY, me)
      return me
    },
    [queryClient],
  )

  const logout = useCallback(async () => {
    await api('/auth/logout/', { method: 'POST' })
    queryClient.clear()
    queryClient.setQueryData(ME_KEY, null)
  }, [queryClient])

  const value = useMemo(
    () => ({ user, isLoading, login, logout }),
    [user, isLoading, login, logout],
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
