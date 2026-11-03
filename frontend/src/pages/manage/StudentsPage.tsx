import { Plus } from 'lucide-react'
import { useState } from 'react'

import { useCurrentUser } from '@/auth/useAuth'
import { DataTable, Pager } from '@/components/DataTable'
import { FilterSelect } from '@/components/FilterSelect'
import { FormDialog, type FieldConfig, type FormValues } from '@/components/FormDialog'
import { PageHeader } from '@/components/PageHeader'
import { SearchInput } from '@/components/SearchInput'
import { StatusBadge } from '@/components/StatusBadge'
import { useFormDialog } from '@/components/useFormDialog'
import { Button } from '@/components/ui/button'
import { LEVEL_OPTIONS } from '@/lib/academic'
import { api } from '@/lib/api'
import { useApiMutation, useApiQuery, useOptions } from '@/lib/queries'
import type { Department, Paginated, Program, Student } from '@/lib/types'

function toPayload(values: FormValues) {
  return {
    email: values.email,
    first_name: values.first_name,
    last_name: values.last_name,
    matric_number: values.matric_number,
    program: Number(values.program),
    level: Number(values.level),
    phone: values.phone ?? '',
    address: values.address ?? '',
    ...(values.password ? { password: values.password } : {}),
  }
}

function toFormValues(student: Student): FormValues {
  return {
    email: student.email,
    first_name: student.first_name,
    last_name: student.last_name,
    matric_number: student.matric_number,
    program: String(student.program),
    level: String(student.level),
    phone: student.phone,
    address: student.address,
  }
}

export default function StudentsPage() {
  const user = useCurrentUser()
  const isSuperAdmin = user.role === 'SUPER_ADMIN'
  const ownDepartment = user.staff_profile?.department
  const [search, setSearch] = useState('')
  const [department, setDepartment] = useState('')
  const [program, setProgram] = useState('')
  const [level, setLevel] = useState('')
  const [page, setPage] = useState(1)
  const dialog = useFormDialog<Student>()

  const departments = useOptions<Department>('/departments/', {}, isSuperAdmin)
  const programs = useOptions<Program>('/programs/', { department: ownDepartment })
  const { data, isLoading, error } = useApiQuery<Paginated<Student>>('/students/', {
    search,
    department,
    program,
    level,
    page,
  })

  const save = useApiMutation(
    (values: FormValues) =>
      dialog.editing
        ? api(`/students/${dialog.editing.id}/`, { method: 'PATCH', body: toPayload(values) })
        : api('/students/', { method: 'POST', body: toPayload(values) }),
    {
      invalidates: ['/students/', '/reports/'],
      successMessage: dialog.editing ? 'Student updated.' : 'Student registered.',
      showsFieldErrors: true,
    },
  )

  const fields: FieldConfig[] = [
    { name: 'first_name', label: 'First name', required: true },
    { name: 'last_name', label: 'Last name', required: true },
    { name: 'email', label: 'Email', type: 'email', required: true },
    { name: 'matric_number', label: 'Matric number', required: true, placeholder: 'CSC/2026/001' },
    {
      name: 'program',
      label: 'Program',
      type: 'select',
      wide: true,
      options: programs.map((p) => ({ value: p.id, label: `${p.name} (${p.department_name})` })),
    },
    { name: 'level', label: 'Level', type: 'select', options: LEVEL_OPTIONS },
    { name: 'phone', label: 'Phone' },
    { name: 'address', label: 'Address', wide: true },
    {
      name: 'password',
      label: 'Initial password',
      type: 'password',
      required: true,
      createOnly: true,
      wide: true,
      hint: 'Share this with the student; at least 8 characters, not all numbers.',
    },
  ]

  const resetPage = (setter: (value: string) => void) => (value: string) => {
    setter(value)
    setPage(1)
  }

  return (
    <>
      <PageHeader
        title="Students"
        description={
          isSuperAdmin
            ? 'Every student in the university.'
            : `Students in ${user.staff_profile?.department_name}.`
        }
        actions={
          <Button onClick={dialog.openCreate}>
            <Plus />
            Register student
          </Button>
        }
      />

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <SearchInput onSearch={resetPage(setSearch)} placeholder="Name, email or matric number" />
        {isSuperAdmin && (
          <FilterSelect
            value={department}
            onChange={resetPage(setDepartment)}
            options={departments.map((d) => ({ value: d.id, label: d.name }))}
            allLabel="All departments"
          />
        )}
        <FilterSelect
          value={program}
          onChange={resetPage(setProgram)}
          options={programs.map((p) => ({ value: p.id, label: p.name }))}
          allLabel="All programs"
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
        rowKey={(student) => student.id}
        isLoading={isLoading}
        error={error}
        empty="No students match these filters."
        footer={<Pager page={page} count={data?.count} onPageChange={setPage} />}
        columns={[
          {
            header: 'Student',
            cell: (s) => (
              <div>
                <p className="font-medium">
                  {s.first_name} {s.last_name}
                </p>
                <p className="text-xs text-muted-foreground">{s.email}</p>
              </div>
            ),
          },
          { header: 'Matric number', cell: (s) => s.matric_number },
          { header: 'Program', cell: (s) => s.program_name, className: 'hidden lg:table-cell' },
          {
            header: 'Department',
            cell: (s) => s.department_name,
            className: isSuperAdmin ? 'hidden md:table-cell' : 'hidden',
          },
          { header: 'Level', cell: (s) => s.level, className: 'text-right' },
          { header: 'Status', cell: (s) => <StatusBadge status={s.status} /> },
          {
            header: <span className="sr-only">Actions</span>,
            cell: (s) => (
              <Button size="sm" variant="outline" onClick={() => dialog.openEdit(s)}>
                Edit
              </Button>
            ),
            className: 'text-right',
          },
        ]}
      />

      <FormDialog
        open={dialog.open}
        onOpenChange={dialog.setOpen}
        title={dialog.editing ? 'Edit student' : 'Register a student'}
        description={
          dialog.editing
            ? 'Changing the level promotes or corrects the student’s academic level.'
            : 'Creates the student’s login and academic profile.'
        }
        fields={fields}
        isEditing={Boolean(dialog.editing)}
        initialValues={dialog.editing ? toFormValues(dialog.editing) : {}}
        onSubmit={save.mutateAsync}
      />
    </>
  )
}
