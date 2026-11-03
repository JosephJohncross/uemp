import { useContext } from 'react'

import { AuthContext } from './AuthContext'

export function useAuth() {
  const auth = useContext(AuthContext)
  if (!auth) throw new Error('useAuth must be used inside <AuthProvider>.')
  return auth
}

export function useCurrentUser() {
  const { user } = useAuth()
  if (!user) throw new Error('useCurrentUser is only available on signed-in pages.')
  return user
}
