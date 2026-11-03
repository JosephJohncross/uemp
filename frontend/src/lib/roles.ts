import type { Role } from './types'

export const ROLE_HOME: Record<Role, string> = {
  STUDENT: '/student',
  LECTURER: '/lecturer',
  DEPT_ADMIN: '/department',
  SUPER_ADMIN: '/admin',
}

export const ROLE_LABEL: Record<Role, string> = {
  STUDENT: 'Student',
  LECTURER: 'Lecturer',
  DEPT_ADMIN: 'Department Admin',
  SUPER_ADMIN: 'Super Admin',
}
