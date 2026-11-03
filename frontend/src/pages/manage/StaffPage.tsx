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
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'
import { useApiMutation, useApiQuery, useOptions } from '@/lib/queries'
import { ROLE_LABEL } from '@/lib/roles'
import type { Department, Paginated, Staff } from '@/lib/types'

const STAFF_ROLE_OPTIONS = [
  { value: 'LECTURER', label: ROLE_LABEL.LECTURER },
  { value: 'DEPT_ADMIN', label: ROLE_LABEL.DEPT_ADMIN },
]

function toPayload(values: FormValues, isEditing: boolean) {
  return {
    email: values.email,
    first_name: values.first_name,
    last_name: values.last_name,
    staff_id: values.staff_id,
    title: values.title ?? '',
    phone: values.phone ?? '',
    department: Number(values.department),
    // Roles change through the user accounts screen so the change is audited as such.
    ...(isEditing ? {} : { role: values.role, password: values.password }),
  }
}

function toFormValues(staff: Staff): FormValues {
  return {
    email: staff.email,
    first_name: staff.first_name,
    last_name: staff.last_name,
    staff_id: staff.staff_id,
    title: staff.title,
    phone: staff.phone,
    department: String(staff.department),
    role: staff.role,
  }
}

export default function StaffPage() {
  const user = useCurrentUser()
  const isSuperAdmin = user.role === 'SUPER_ADMIN'
  const [search, setSearch] = useState('')
  const [department, setDepartment] = useState('')
  const [role, setRole] = useState(isSuperAdmin ? '' : 'LECTURER')
  const [page, setPage] = useState(1)
  const dialog = useFormDialog<Staff>()

  const departments = useOptions<Department>('/departments/')
  const departmentOptions = departments
    .filter((d) => isSuperAdmin || d.id === user.staff_profile?.department)
    .map((d) => ({ value: d.id, label: d.name }))

  const { data, isLoading, error } = useApiQuery<Paginated<Staff>>('/staff/', {
    search,
    department,
    role,
    page,
  })

  const isEditing = Boolean(dialog.editing)
  const save = useApiMutation(
    (values: FormValues) =>
      dialog.editing
        ? api(`/staff/${dialog.editing.id}/`, {
            method: 'PATCH',
            body: toPayload(values, true),
          })
        : api('/staff/', { method: 'POST', body: toPayload(values, false) }),
    {
      invalidates: ['/staff/', '/reports/'],
      successMessage: isEditing ? 'Staff profile updated.' : 'Staff account created.',
      showsFieldErrors: true,
    },
  )

  const fields: FieldConfig[] = [
    { name: 'title', label: 'Title', placeholder: 'Dr., Prof., Mr.' },
    { name: 'staff_id', label: 'Staff ID', required: true },
    { name: 'first_name', label: 'First name', required: true },
    { name: 'last_name', label: 'Last name', required: true },
    { name: 'email', label: 'Email', type: 'email', required: true },
    { name: 'phone', label: 'Phone' },
    {
      name: 'department',
      label: 'Department',
      type: 'select',
      wide: true,
      options: departmentOptions,
    },
    ...(isSuperAdmin
      ? [
          {
            name: 'role',
            label: 'Role',
            type: 'select' as const,
            wide: true,
            createOnly: true,
            options: STAFF_ROLE_OPTIONS,
          },
        ]
      : []),
    {
      name: 'password',
      label: 'Initial password',
      type: 'password',
      required: true,
      createOnly: true,
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
        title={isSuperAdmin ? 'Staff' : 'Lecturers'}
        description={
          isSuperAdmin
            ? 'Lecturers and department administrators across the university.'
            : `Lecturers in ${user.staff_profile?.department_name}.`
        }
        actions={
          <Button onClick={dialog.openCreate}>
            <Plus />
            {isSuperAdmin ? 'Add staff' : 'Add lecturer'}
          </Button>
        }
      />

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <SearchInput onSearch={resetPage(setSearch)} placeholder="Name, email or staff ID" />
        {isSuperAdmin && (
          <>
            <FilterSelect
              value={department}
              onChange={resetPage(setDepartment)}
              options={departmentOptions}
              allLabel="All departments"
            />
            <FilterSelect
              value={role}
              onChange={resetPage(setRole)}
              options={STAFF_ROLE_OPTIONS}
              allLabel="All staff roles"
            />
          </>
        )}
      </div>

      <DataTable
        rows={data?.results}
        rowKey={(staff) => staff.id}
        isLoading={isLoading}
        error={error}
        empty="No staff match these filters."
        footer={<Pager page={page} count={data?.count} onPageChange={setPage} />}
        columns={[
          {
            header: 'Name',
            cell: (s) => (
              <div>
                <p className="font-medium">
                  {s.title} {s.first_name} {s.last_name}
                </p>
                <p className="text-xs text-muted-foreground">{s.email}</p>
              </div>
            ),
          },
          { header: 'Staff ID', cell: (s) => s.staff_id },
          {
            header: 'Department',
            cell: (s) => s.department_name,
            className: 'hidden md:table-cell',
          },
          {
            header: 'Role',
            cell: (s) => <Badge variant="outline">{ROLE_LABEL[s.role]}</Badge>,
            className: 'hidden sm:table-cell',
          },
          { header: 'Status', cell: (s) => <StatusBadge status={s.status} /> },
          {
            header: <span className="sr-only">Actions</span>,
            cell: (s) =>
              isSuperAdmin || s.role === 'LECTURER' ? (
                <Button size="sm" variant="outline" onClick={() => dialog.openEdit(s)}>
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
        title={isEditing ? 'Edit staff profile' : isSuperAdmin ? 'Add staff' : 'Add a lecturer'}
        fields={fields}
        isEditing={isEditing}
        initialValues={
          dialog.editing
            ? toFormValues(dialog.editing)
            : {
                role: 'LECTURER',
                department: isSuperAdmin ? '' : String(user.staff_profile?.department ?? ''),
              }
        }
        onSubmit={save.mutateAsync}
      />
    </>
  )
}
