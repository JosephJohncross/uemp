import { Plus } from 'lucide-react'

import { DataTable } from '@/components/DataTable'
import { DeleteButton } from '@/components/DeleteButton'
import { FormDialog, type FormValues } from '@/components/FormDialog'
import { PageHeader } from '@/components/PageHeader'
import { useFormDialog } from '@/components/useFormDialog'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { api } from '@/lib/api'
import { useApiMutation, useApiQuery } from '@/lib/queries'
import type { Department, Faculty, Paginated } from '@/lib/types'

export default function StructurePage() {
  const faculties = useApiQuery<Paginated<Faculty>>('/faculties/', { page_size: 200 })
  const departments = useApiQuery<Paginated<Department>>('/departments/', { page_size: 200 })
  const facultyDialog = useFormDialog<Faculty>()
  const departmentDialog = useFormDialog<Department>()

  const saveFaculty = useApiMutation(
    (values: FormValues) => {
      const body = { name: values.name, code: values.code }
      return facultyDialog.editing
        ? api(`/faculties/${facultyDialog.editing.id}/`, { method: 'PATCH', body })
        : api('/faculties/', { method: 'POST', body })
    },
    {
      invalidates: ['/faculties/', '/departments/'],
      successMessage: 'Faculty saved.',
      showsFieldErrors: true,
    },
  )

  const saveDepartment = useApiMutation(
    (values: FormValues) => {
      const body = { name: values.name, code: values.code, faculty: Number(values.faculty) }
      return departmentDialog.editing
        ? api(`/departments/${departmentDialog.editing.id}/`, { method: 'PATCH', body })
        : api('/departments/', { method: 'POST', body })
    },
    {
      invalidates: ['/departments/', '/reports/'],
      successMessage: 'Department saved.',
      showsFieldErrors: true,
    },
  )

  const departmentCount = (facultyId: number) =>
    departments.data?.results.filter((d) => d.faculty === facultyId).length ?? 0

  return (
    <>
      <PageHeader
        title="Faculties & departments"
        description="The university's academic structure."
      />

      <Tabs defaultValue="departments">
        <TabsList>
          <TabsTrigger value="departments">Departments</TabsTrigger>
          <TabsTrigger value="faculties">Faculties</TabsTrigger>
        </TabsList>

        <TabsContent value="departments" className="space-y-3">
          <div className="flex justify-end">
            <Button onClick={departmentDialog.openCreate}>
              <Plus />
              Add department
            </Button>
          </div>
          <DataTable
            rows={departments.data?.results}
            rowKey={(d) => d.id}
            isLoading={departments.isLoading}
            error={departments.error}
            columns={[
              { header: 'Department', cell: (d) => <span className="font-medium">{d.name}</span> },
              { header: 'Code', cell: (d) => d.code },
              { header: 'Faculty', cell: (d) => d.faculty_name, className: 'hidden sm:table-cell' },
              {
                header: <span className="sr-only">Actions</span>,
                cell: (d) => (
                  <div className="flex justify-end gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => departmentDialog.openEdit(d)}
                    >
                      Edit
                    </Button>
                    <DeleteButton
                      path={`/departments/${d.id}/`}
                      label={d.name}
                      invalidates={['/departments/', '/reports/']}
                    />
                  </div>
                ),
                className: 'text-right',
              },
            ]}
          />
        </TabsContent>

        <TabsContent value="faculties" className="space-y-3">
          <div className="flex justify-end">
            <Button onClick={facultyDialog.openCreate}>
              <Plus />
              Add faculty
            </Button>
          </div>
          <DataTable
            rows={faculties.data?.results}
            rowKey={(f) => f.id}
            isLoading={faculties.isLoading}
            error={faculties.error}
            columns={[
              { header: 'Faculty', cell: (f) => <span className="font-medium">{f.name}</span> },
              { header: 'Code', cell: (f) => f.code },
              {
                header: 'Departments',
                cell: (f) => departmentCount(f.id),
                className: 'text-right',
              },
              {
                header: <span className="sr-only">Actions</span>,
                cell: (f) => (
                  <div className="flex justify-end gap-1">
                    <Button size="sm" variant="outline" onClick={() => facultyDialog.openEdit(f)}>
                      Edit
                    </Button>
                    <DeleteButton
                      path={`/faculties/${f.id}/`}
                      label={f.name}
                      invalidates={['/faculties/']}
                    />
                  </div>
                ),
                className: 'text-right',
              },
            ]}
          />
        </TabsContent>
      </Tabs>

      <FormDialog
        open={facultyDialog.open}
        onOpenChange={facultyDialog.setOpen}
        title={facultyDialog.editing ? 'Edit faculty' : 'Add a faculty'}
        fields={[
          {
            name: 'name',
            label: 'Name',
            required: true,
            wide: true,
            placeholder: 'Faculty of Law',
          },
          { name: 'code', label: 'Code', required: true, placeholder: 'LAW' },
        ]}
        isEditing={Boolean(facultyDialog.editing)}
        initialValues={
          facultyDialog.editing
            ? { name: facultyDialog.editing.name, code: facultyDialog.editing.code }
            : {}
        }
        onSubmit={saveFaculty.mutateAsync}
      />

      <FormDialog
        open={departmentDialog.open}
        onOpenChange={departmentDialog.setOpen}
        title={departmentDialog.editing ? 'Edit department' : 'Add a department'}
        fields={[
          { name: 'name', label: 'Name', required: true, wide: true },
          { name: 'code', label: 'Code', required: true, placeholder: 'CSC' },
          {
            name: 'faculty',
            label: 'Faculty',
            type: 'select',
            options: faculties.data?.results.map((f) => ({ value: f.id, label: f.name })),
          },
        ]}
        isEditing={Boolean(departmentDialog.editing)}
        initialValues={
          departmentDialog.editing
            ? {
                name: departmentDialog.editing.name,
                code: departmentDialog.editing.code,
                faculty: String(departmentDialog.editing.faculty),
              }
            : {}
        }
        onSubmit={saveDepartment.mutateAsync}
      />
    </>
  )
}
