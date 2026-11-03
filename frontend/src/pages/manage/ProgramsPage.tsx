import { Plus } from 'lucide-react'

import { useCurrentUser } from '@/auth/useAuth'
import { DataTable } from '@/components/DataTable'
import { FormDialog, type FieldConfig, type FormValues } from '@/components/FormDialog'
import { PageHeader } from '@/components/PageHeader'
import { useFormDialog } from '@/components/useFormDialog'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'
import { useApiMutation, useApiQuery, useOptions } from '@/lib/queries'
import type { Department, Paginated, Program } from '@/lib/types'

const DURATION_OPTIONS = [1, 2, 3, 4, 5].map((years) => ({
  value: years,
  label: `${years} year${years > 1 ? 's' : ''} (up to ${years * 100} level)`,
}))

export default function ProgramsPage() {
  const user = useCurrentUser()
  const isSuperAdmin = user.role === 'SUPER_ADMIN'
  const ownDepartment = user.staff_profile?.department
  const dialog = useFormDialog<Program>()

  const departments = useOptions<Department>('/departments/')
  const { data, isLoading, error } = useApiQuery<Paginated<Program>>('/programs/', {
    department: ownDepartment,
    page_size: 200,
  })

  const save = useApiMutation(
    (values: FormValues) => {
      const body = {
        name: values.name,
        code: values.code,
        department: Number(values.department),
        duration_years: Number(values.duration_years),
      }
      return dialog.editing
        ? api(`/programs/${dialog.editing.id}/`, { method: 'PATCH', body })
        : api('/programs/', { method: 'POST', body })
    },
    { invalidates: ['/programs/'], successMessage: 'Program saved.', showsFieldErrors: true },
  )

  const fields: FieldConfig[] = [
    {
      name: 'name',
      label: 'Name',
      required: true,
      wide: true,
      placeholder: 'B.Sc. Computer Science',
    },
    { name: 'code', label: 'Code', required: true, placeholder: 'BSC-CSC' },
    { name: 'duration_years', label: 'Duration', type: 'select', options: DURATION_OPTIONS },
    {
      name: 'department',
      label: 'Department',
      type: 'select',
      wide: true,
      options: departments
        .filter((d) => isSuperAdmin || d.id === ownDepartment)
        .map((d) => ({ value: d.id, label: d.name })),
    },
  ]

  return (
    <>
      <PageHeader
        title="Programs"
        description="Degree programs and how many levels each one runs for."
        actions={
          <Button onClick={dialog.openCreate}>
            <Plus />
            Add program
          </Button>
        }
      />

      <DataTable
        rows={data?.results}
        rowKey={(program) => program.id}
        isLoading={isLoading}
        error={error}
        columns={[
          { header: 'Program', cell: (p) => <span className="font-medium">{p.name}</span> },
          { header: 'Code', cell: (p) => p.code },
          {
            header: 'Department',
            cell: (p) => p.department_name,
            className: 'hidden md:table-cell',
          },
          { header: 'Duration', cell: (p) => `${p.duration_years} years` },
          {
            header: 'Levels',
            cell: (p) => `100 – ${p.max_level}`,
            className: 'hidden sm:table-cell',
          },
          {
            header: <span className="sr-only">Actions</span>,
            cell: (p) => (
              <Button size="sm" variant="outline" onClick={() => dialog.openEdit(p)}>
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
        title={dialog.editing ? 'Edit program' : 'Add a program'}
        fields={fields}
        isEditing={Boolean(dialog.editing)}
        initialValues={
          dialog.editing
            ? {
                name: dialog.editing.name,
                code: dialog.editing.code,
                department: String(dialog.editing.department),
                duration_years: String(dialog.editing.duration_years),
              }
            : { department: ownDepartment ? String(ownDepartment) : '', duration_years: '4' }
        }
        onSubmit={save.mutateAsync}
      />
    </>
  )
}
