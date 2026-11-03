import { useState } from 'react'

import { DataTable, Pager } from '@/components/DataTable'
import { FilterSelect } from '@/components/FilterSelect'
import { PageHeader } from '@/components/PageHeader'
import { SearchInput } from '@/components/SearchInput'
import { Badge } from '@/components/ui/badge'
import { formatDateTime } from '@/lib/format'
import { useApiQuery } from '@/lib/queries'
import { ROLE_LABEL } from '@/lib/roles'
import type { AuditEntry, Paginated } from '@/lib/types'

// Filters match on the action prefix, e.g. "result." covers submit, approve, reject and reopen.
const ACTION_OPTIONS = [
  { value: 'result.', label: 'Results' },
  { value: 'registration.', label: 'Course registration' },
  { value: 'course.', label: 'Courses & allocation' },
  { value: 'user.', label: 'Account status & roles' },
  { value: 'student.', label: 'Student records' },
  { value: 'staff.', label: 'Staff records' },
  { value: 'semester.', label: 'Semesters' },
  { value: 'auth.', label: 'Sign-ins' },
]

export default function AuditLogPage() {
  const [action, setAction] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const { data, isLoading, error } = useApiQuery<Paginated<AuditEntry>>('/audit-logs/', {
    action,
    search,
    page,
  })

  return (
    <>
      <PageHeader
        title="Audit log"
        description="Every result submission, approval, rejection, score change and administrative action."
      />

      <div className="flex flex-col gap-2 sm:flex-row">
        <SearchInput
          onSearch={(value) => {
            setSearch(value)
            setPage(1)
          }}
          placeholder="Search descriptions"
        />
        <FilterSelect
          value={action}
          onChange={(value) => {
            setAction(value)
            setPage(1)
          }}
          options={ACTION_OPTIONS}
          allLabel="All activity"
        />
      </div>

      <DataTable
        rows={data?.results}
        rowKey={(entry) => entry.id}
        isLoading={isLoading}
        error={error}
        empty="No activity matches these filters."
        footer={<Pager page={page} count={data?.count} onPageChange={setPage} />}
        columns={[
          {
            header: 'When',
            cell: (e) => <span className="whitespace-nowrap">{formatDateTime(e.created_at)}</span>,
          },
          {
            header: 'Who',
            cell: (e) => (
              <div>
                <p className="font-medium">{e.actor_name || e.actor_email || 'System'}</p>
                {e.actor_role && (
                  <p className="text-xs text-muted-foreground">{ROLE_LABEL[e.actor_role]}</p>
                )}
              </div>
            ),
            className: 'hidden sm:table-cell',
          },
          {
            header: 'What',
            cell: (e) => (
              <div className="space-y-1">
                <p>{e.summary}</p>
                {typeof e.details.comment === 'string' && e.details.comment && (
                  <p className="text-xs text-muted-foreground">“{e.details.comment}”</p>
                )}
              </div>
            ),
          },
          {
            header: 'Action',
            cell: (e) => <Badge variant="outline">{e.action}</Badge>,
            className: 'hidden lg:table-cell',
          },
        ]}
      />
    </>
  )
}
