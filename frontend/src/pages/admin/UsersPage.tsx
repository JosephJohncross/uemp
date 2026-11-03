import { MoreHorizontal } from 'lucide-react'
import { useState } from 'react'

import { useCurrentUser } from '@/auth/useAuth'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { DataTable, Pager } from '@/components/DataTable'
import { FilterSelect } from '@/components/FilterSelect'
import { PageHeader } from '@/components/PageHeader'
import { SearchInput } from '@/components/SearchInput'
import { StatusBadge } from '@/components/StatusBadge'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { api } from '@/lib/api'
import { formatDateTime } from '@/lib/format'
import { useApiMutation, useApiQuery } from '@/lib/queries'
import { ROLE_LABEL } from '@/lib/roles'
import type { Paginated, Role, User, UserStatus } from '@/lib/types'

const ROLE_OPTIONS = (Object.keys(ROLE_LABEL) as Role[]).map((role) => ({
  value: role,
  label: ROLE_LABEL[role],
}))
const STATUS_OPTIONS = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'SUSPENDED', label: 'Suspended' },
  { value: 'DEACTIVATED', label: 'Deactivated' },
]
const STATUS_ACTIONS: Record<UserStatus, string> = {
  ACTIVE: 'Activate',
  SUSPENDED: 'Suspend',
  DEACTIVATED: 'Deactivate',
}

type Change =
  { user: User; field: 'status'; value: UserStatus } | { user: User; field: 'role'; value: Role }

function describe(change: Change) {
  if (change.field === 'role') {
    return `${change.user.full_name} becomes a ${ROLE_LABEL[change.value].toLowerCase()}. Their access changes on their next request.`
  }
  if (change.value === 'ACTIVE') return `${change.user.full_name} will be able to sign in again.`
  return `${change.user.full_name} is signed out immediately and can't sign in until reactivated.`
}

export default function UsersPage() {
  const me = useCurrentUser()
  const [search, setSearch] = useState('')
  const [role, setRole] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [change, setChange] = useState<Change | null>(null)

  const { data, isLoading, error } = useApiQuery<Paginated<User>>('/users/', {
    search,
    role,
    status,
    page,
  })

  const applyChange = useApiMutation(
    ({ user, field, value }: Change) =>
      api(`/users/${user.id}/${field}/`, { method: 'POST', body: { [field]: value } }),
    {
      invalidates: ['/users/', '/students/', '/staff/', '/reports/'],
      successMessage: 'Account updated.',
    },
  )

  const resetPage = (setter: (value: string) => void) => (value: string) => {
    setter(value)
    setPage(1)
  }

  return (
    <>
      <PageHeader
        title="User accounts"
        description="Activate, suspend or deactivate accounts, and move staff between roles."
      />

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <SearchInput onSearch={resetPage(setSearch)} placeholder="Name or email" />
        <FilterSelect
          value={role}
          onChange={resetPage(setRole)}
          options={ROLE_OPTIONS}
          allLabel="All roles"
        />
        <FilterSelect
          value={status}
          onChange={resetPage(setStatus)}
          options={STATUS_OPTIONS}
          allLabel="All statuses"
        />
      </div>

      <DataTable
        rows={data?.results}
        rowKey={(u) => u.id}
        isLoading={isLoading}
        error={error}
        footer={<Pager page={page} count={data?.count} onPageChange={setPage} />}
        columns={[
          {
            header: 'User',
            cell: (u) => (
              <div>
                <p className="font-medium">{u.full_name}</p>
                <p className="text-xs text-muted-foreground">{u.email}</p>
              </div>
            ),
          },
          { header: 'Role', cell: (u) => <Badge variant="outline">{ROLE_LABEL[u.role]}</Badge> },
          { header: 'Status', cell: (u) => <StatusBadge status={u.status} /> },
          {
            header: 'Last sign-in',
            cell: (u) => formatDateTime(u.last_login),
            className: 'hidden md:table-cell',
          },
          {
            header: <span className="sr-only">Actions</span>,
            className: 'text-right',
            cell: (u) =>
              u.id === me.id ? null : (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="icon" variant="ghost" aria-label={`Manage ${u.email}`}>
                      <MoreHorizontal />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Account status</DropdownMenuLabel>
                    {(Object.keys(STATUS_ACTIONS) as UserStatus[])
                      .filter((value) => value !== u.status)
                      .map((value) => (
                        <DropdownMenuItem
                          key={value}
                          onClick={() => setChange({ user: u, field: 'status', value })}
                        >
                          {STATUS_ACTIONS[value]}
                        </DropdownMenuItem>
                      ))}
                    {(u.role === 'LECTURER' || u.role === 'DEPT_ADMIN') && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuLabel>Role</DropdownMenuLabel>
                        <DropdownMenuItem
                          onClick={() =>
                            setChange({
                              user: u,
                              field: 'role',
                              value: u.role === 'LECTURER' ? 'DEPT_ADMIN' : 'LECTURER',
                            })
                          }
                        >
                          Make {u.role === 'LECTURER' ? 'department admin' : 'lecturer'}
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              ),
          },
        ]}
      />

      {change && (
        <ConfirmDialog
          open
          onOpenChange={(open) => !open && setChange(null)}
          title={
            change.field === 'status'
              ? `${STATUS_ACTIONS[change.value]} ${change.user.email}?`
              : `Change role for ${change.user.email}?`
          }
          description={describe(change)}
          confirmLabel="Confirm"
          destructive={change.field === 'status' && change.value !== 'ACTIVE'}
          onConfirm={() => applyChange.mutateAsync(change)}
        />
      )}
    </>
  )
}
