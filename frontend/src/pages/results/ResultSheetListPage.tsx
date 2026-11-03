import { useState } from 'react'
import { Link } from 'react-router'

import { useCurrentUser } from '@/auth/useAuth'
import { DataTable, Pager } from '@/components/DataTable'
import { FilterSelect } from '@/components/FilterSelect'
import { PageHeader } from '@/components/PageHeader'
import { StatusBadge } from '@/components/StatusBadge'
import { Button } from '@/components/ui/button'
import { formatDateTime } from '@/lib/format'
import { useApiQuery, useOptions } from '@/lib/queries'
import { ROLE_HOME } from '@/lib/roles'
import type { Department, Paginated, ResultSheet, Semester } from '@/lib/types'

const STATUS_OPTIONS = [
  { value: 'SUBMITTED', label: 'Awaiting review' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'RETURNED', label: 'Returned' },
  { value: 'APPROVED', label: 'Approved' },
]

const DESCRIPTIONS = {
  LECTURER: 'Every result sheet for courses allocated to you.',
  DEPT_ADMIN: 'Result sheets for your department. Submitted sheets wait for your review.',
  SUPER_ADMIN: 'Oversee result approvals across every department.',
  STUDENT: '',
}

export default function ResultSheetListPage() {
  const user = useCurrentUser()
  const isLecturer = user.role === 'LECTURER'
  const [status, setStatus] = useState(isLecturer ? '' : 'SUBMITTED')
  const [semester, setSemester] = useState('')
  const [department, setDepartment] = useState('')
  const [page, setPage] = useState(1)
  const semesters = useOptions<Semester>('/semesters/')
  const departments = useOptions<Department>('/departments/', {}, user.role === 'SUPER_ADMIN')

  const { data, isLoading, error } = useApiQuery<Paginated<ResultSheet>>('/result-sheets/', {
    status,
    semester,
    department,
    page,
  })
  const basePath = `${ROLE_HOME[user.role]}/results`

  function filter(setter: (value: string) => void) {
    return (value: string) => {
      setter(value)
      setPage(1)
    }
  }

  return (
    <>
      <PageHeader
        title={isLecturer ? 'Result sheets' : 'Result approvals'}
        description={DESCRIPTIONS[user.role]}
      />

      <div className="flex flex-col gap-2 sm:flex-row">
        <FilterSelect
          value={status}
          onChange={filter(setStatus)}
          options={STATUS_OPTIONS}
          allLabel="All statuses"
        />
        <FilterSelect
          value={semester}
          onChange={filter(setSemester)}
          options={semesters.map((s) => ({ value: s.id, label: s.label }))}
          allLabel="All semesters"
        />
        {user.role === 'SUPER_ADMIN' && (
          <FilterSelect
            value={department}
            onChange={filter(setDepartment)}
            options={departments.map((d) => ({ value: d.id, label: d.name }))}
            allLabel="All departments"
          />
        )}
      </div>

      <DataTable
        rows={data?.results}
        rowKey={(sheet) => sheet.id}
        isLoading={isLoading}
        error={error}
        empty="No result sheets match these filters."
        footer={<Pager page={page} count={data?.count} onPageChange={setPage} />}
        columns={[
          {
            header: 'Course',
            cell: (sheet) => (
              <div>
                <p className="font-medium">{sheet.course.code}</p>
                <p className="text-xs text-muted-foreground">{sheet.course.title}</p>
              </div>
            ),
          },
          {
            header: 'Semester',
            cell: (sheet) => sheet.semester_label,
            className: 'hidden md:table-cell',
          },
          {
            header: 'Lecturer',
            cell: (sheet) => sheet.lecturer_name ?? '—',
            className: 'hidden lg:table-cell',
          },
          { header: 'Students', cell: (sheet) => sheet.registered_count, className: 'text-right' },
          { header: 'Status', cell: (sheet) => <StatusBadge status={sheet.status} /> },
          {
            header: 'Last change',
            cell: (sheet) => formatDateTime(sheet.updated_at),
            className: 'hidden sm:table-cell',
          },
          {
            header: <span className="sr-only">Open</span>,
            cell: (sheet) => (
              <Button asChild size="sm" variant="outline">
                <Link to={`${basePath}/${sheet.id}`}>Open</Link>
              </Button>
            ),
            className: 'text-right',
          },
        ]}
      />
    </>
  )
}
