import { Navigate, Outlet, useLocation } from 'react-router'

import { ROLE_HOME } from '@/lib/roles'
import type { Role } from '@/lib/types'

import { useAuth } from './useAuth'

/**
 * Keeps users on the pages meant for their role. This is only navigation;
 * the API enforces the same rules on every request.
 */
export function RequireRole({ role }: { role: Role }) {
  const { user } = useAuth()
  const location = useLocation()

  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  if (user.role !== role) return <Navigate to={ROLE_HOME[user.role]} replace />
  return <Outlet />
}
