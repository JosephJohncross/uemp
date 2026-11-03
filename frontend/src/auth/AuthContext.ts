import { createContext } from 'react'

import type { Me } from '@/lib/types'

export interface AuthState {
  user: Me | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<Me>
  logout: () => Promise<void>
}

export const AuthContext = createContext<AuthState | null>(null)
