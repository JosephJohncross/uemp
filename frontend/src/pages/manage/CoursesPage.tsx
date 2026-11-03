import { Plus } from 'lucide-react'
import { useState } from 'react'

import { useCurrentUser } from '@/auth/useAuth'
import { DataTable, Pager } from '@/components/DataTable'
import { FilterSelect } from '@/components/FilterSelect'
import { FormDialog, type FieldConfig, type FormValues } from '@/components/FormDialog'
import { PageHeader } from '@/components/PageHeader'
import { SearchInput } from '@/components/SearchInput'
import { useFormDialog } from '@/components/useFormDialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { LEVEL_OPTIONS, TERM_OPTIONS } from '@/lib/academic'
import { api } from '@/lib/api'
import { TERM_LABEL } from '@/lib/format'
import { useApiMutation, useApiQuery, useOptions } from '@/lib/queries'
import type { Course, Department, Paginated, Program } from '@/lib/types'

function toPayload(values: FormValues) {
  return {
    code: values.code,
    title: values.title,
    units: Number(values.units),
    level: Number(values.level),
    term: values.term,
    department: Number(values.department),
    programs: values.programs ? values.programs.split(',').map(Number) : [],
    is_active: values.is_active !== 'false',
  }
}

function toFormValues(course: Course): FormValues {
  return {
    code: course.code,
    title: course.title,
    units: String(course.units),
    level: String(course.level),
    term: course.term,
    department: String(course.department),
    programs: course.programs.join(','),
    is_active: String(course.is_active),
  }
}

export default function CoursesPage() {
  const user = useCurrentUser()
  const isSuperAdmin = user.role === 'SUPER_ADMIN'
  const ownDepartment = user.staff_profile?.department
  const [search, setSearch] = useState('')
  const [department, setDepartment] = useState('')
  const [level, setLevel] = useState('')
  const [term, setTerm] = useState('')
  const [page, setPage] = useState(1)
  const dialog = useFormDialog<Course>()

  const departments = useOptions<Department>('/departments/')
  const programs = useOptions<Program>('/programs/')
  const { data, isLoading, error } = useApiQuery<Paginated<Course>>('/courses/', {
    search,
    department,
    level,
    term,
    page,
  })

  const save = useApiMutation(
    (values: FormValues) =>
      dialog.editing
        ? api(`/courses/${dialog.editing.id}/`, { method: 'PATCH', body: toPayload(values) })
        : api('/courses/', { method: 'POST', body: toPayload(values) }),
    { invalidates: ['/courses/'], successMessage: 'Course saved.', showsFieldErrors: true },
  )

  const fields: FieldConfig[] = [
    { name: 'code', label: 'Course code', required: true, placeholder: 'CSC301' },
    {
      name: 'units',
      label: 'Units',
      type: 'select',
      options: [1, 2, 3, 4, 5, 6].map((u) => ({ value: u, label: `${u} unit${u > 1 ? 's' : ''}` })),
    },
    { name: 'title', label: 'Title', required: true, wide: true },
    { name: 'level', label: 'Level', type: 'select', options: LEVEL_OPTIONS },
    { name: 'term', label: 'Semester', type: 'select', options: TERM_OPTIONS },
    {
      name: 'department',
      label: 'Owning department',
      type: 'select',
      wide: true,
      options: departments
        .filter((d) => isSuperAdmin || d.id === ownDepartment)
        .map((d) => ({ value: d.id, label: d.name })),
    },
    {
      name: 'programs',
      label: 'Offered to programs',
      type: 'checklist',
      wide: true,
      options: programs.map((p) => ({ value: p.id, label: p.name })),
      hint: 'Students in these programs can register the course at its level and semester.',
    },
    {
      name: 'is_active',
      label: 'Status',
      type: 'select',
      options: [
        { value: 'true', label: 'Active — open for registration' },
        { value: 'false', label: 'Inactive — hidden from registration' },
      ],
      wide: true,
    },
  ]

  const resetPage = (setter: (value: string) => void) => (value: string) => {
    setter(value)
    setPage(1)
  }

  return (
    <>
      <PageHeader
        title="Courses"
        description={
          isSuperAdmin
            ? 'Courses across every department.'
            : `Courses owned by ${user.staff_profile?.department_name}.`
        }
        actions={
          <Button onClick={dialog.openCreate}>
            <Plus />
            Add course
          </Button>
        }
      />

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <SearchInput onSearch={resetPage(setSearch)} placeholder="Code or title" />
        {isSuperAdmin && (
          <FilterSelect
            value={department}
            onChange={resetPage(setDepartment)}
            options={departments.map((d) => ({ value: d.id, label: d.name }))}
            allLabel="All departments"
          />
        )}
        <FilterSelect
          value={level}
          onChange={resetPage(setLevel)}
          options={LEVEL_OPTIONS}
          allLabel="All levels"
        />
        <FilterSelect
          value={term}
          onChange={resetPage(setTerm)}
          options={TERM_OPTIONS}
          allLabel="Both semesters"
        />
      </div>

      <DataTable
        rows={data?.results}
        rowKey={(course) => course.id}
        isLoading={isLoading}
        error={error}
        empty="No courses match these filters."
        footer={<Pager page={page} count={data?.count} onPageChange={setPage} />}
        columns={[
          {
            header: 'Course',
            cell: (c) => (
              <div>
                <p className="font-medium">{c.code}</p>
                <p className="text-xs text-muted-foreground">{c.title}</p>
              </div>
            ),
          },
          { header: 'Units', cell: (c) => c.units, className: 'text-right' },
          { header: 'Level', cell: (c) => c.level, className: 'text-right' },
          {
            header: 'Semester',
            cell: (c) => TERM_LABEL[c.term],
            className: 'hidden sm:table-cell',
          },
          {
            header: 'Offered to',
            cell: (c) => (
              <div className="flex flex-wrap gap-1">
                {c.program_codes.map((code) => (
                  <Badge key={code} variant="outline">
                    {code}
                  </Badge>
                ))}
              </div>
            ),
            className: 'hidden lg:table-cell',
          },
          {
            header: 'Status',
            cell: (c) =>
              c.is_active ? (
                <Badge variant="secondary">Active</Badge>
              ) : (
                <Badge variant="outline">Inactive</Badge>
              ),
            className: 'hidden md:table-cell',
          },
          {
            header: <span className="sr-only">Actions</span>,
            cell: (c) =>
              isSuperAdmin || c.department === ownDepartment ? (
                <Button size="sm" variant="outline" onClick={() => dialog.openEdit(c)}>
                  Edit
                </Button>
              ) : null,
            className: 'text-right',
          },
        ]}
      />

      <FormDialog
        open={dialog.open}
        onOpenChange={dialog.setOpen}
        title={dialog.editing ? `Edit ${dialog.editing.code}` : 'Add a course'}
        fields={fields}
        isEditing={Boolean(dialog.editing)}
        initialValues={
          dialog.editing
            ? toFormValues(dialog.editing)
            : {
                department: ownDepartment ? String(ownDepartment) : '',
                units: '3',
                level: '100',
                term: 'FIRST',
                is_active: 'true',
              }
        }
        onSubmit={save.mutateAsync}
      />
    </>
  )
}
