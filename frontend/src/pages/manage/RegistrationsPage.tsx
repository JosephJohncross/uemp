import { useState } from 'react'

import { DataTable, Pager } from '@/components/DataTable'
import { FilterSelect } from '@/components/FilterSelect'
import { PageHeader } from '@/components/PageHeader'
import { SearchInput } from '@/components/SearchInput'
import { LEVEL_OPTIONS } from '@/lib/academic'
import { formatDateTime } from '@/lib/format'
import { useApiQuery, useOptions } from '@/lib/queries'
import type { Paginated, Registration, Semester } from '@/lib/types'

export default function RegistrationsPage() {
  const [semester, setSemester] = useState('')
  const [level, setLevel] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const semesters = useOptions<Semester>('/semesters/')

  const { data, isLoading, error } = useApiQuery<Paginated<Registration>>('/registrations/', {
    semester,
    level,
    search,
    page,
  })

  const resetPage = (setter: (value: string) => void) => (value: string) => {
    setter(value)
    setPage(1)
  }

  return (
    <>
      <PageHeader
        title="Course registrations"
        description={`Showing ${
          semesters.find((s) => String(s.id) === semester)?.label ?? 'the current semester'
        }.`}
      />

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <SearchInput onSearch={resetPage(setSearch)} placeholder="Student, matric or course code" />
        <FilterSelect
          value={semester}
          onChange={resetPage(setSemester)}
          options={semesters.map((s) => ({ value: s.id, label: s.label }))}
          allLabel="Current semester"
        />
        <FilterSelect
          value={level}
          onChange={resetPage(setLevel)}
          options={LEVEL_OPTIONS}
          allLabel="All levels"
        />
      </div>

      <DataTable
        rows={data?.results}
        rowKey={(r) => r.id}
        isLoading={isLoading}
        error={error}
        empty="No registrations match these filters."
        footer={<Pager page={page} count={data?.count} onPageChange={setPage} />}
        columns={[
          {
            header: 'Student',
            cell: (r) => (
              <div>
                <p className="font-medium">{r.student_name}</p>
                <p className="text-xs text-muted-foreground">{r.matric_number}</p>
              </div>
            ),
          },
          { header: 'Level', cell: (r) => r.student_level, className: 'text-right' },
          {
            header: 'Course',
            cell: (r) => (
              <div>
                <p className="font-medium">{r.course.code}</p>
                <p className="text-xs text-muted-foreground">{r.course.title}</p>
              </div>
            ),
          },
          { header: 'Units', cell: (r) => r.course.units, className: 'text-right' },
          {
            header: 'Registered',
            cell: (r) => formatDateTime(r.registered_at),
            className: 'hidden md:table-cell',
          },
        ]}
      />
    </>
  )
}
