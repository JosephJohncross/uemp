import { Trash2 } from 'lucide-react'
import { useState } from 'react'

import { ConfirmDialog } from '@/components/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'
import { useApiMutation } from '@/lib/queries'

interface DeleteButtonProps {
  /** API path of the record, e.g. `/courses/12/`. */
  path: string
  label: string
  invalidates: string[]
}

/**
 * Deletion is refused by the API (409) for anything other records depend on, such as a
 * course with registrations, so this only succeeds for records created by mistake.
 */
export function DeleteButton({ path, label, invalidates }: DeleteButtonProps) {
  const [open, setOpen] = useState(false)
  const remove = useApiMutation(() => api(path, { method: 'DELETE' }), {
    invalidates,
    successMessage: `${label} deleted.`,
  })

  return (
    <>
      <Button
        size="icon"
        variant="ghost"
        aria-label={`Delete ${label}`}
        onClick={() => setOpen(true)}
      >
        <Trash2 className="text-destructive" />
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={`Delete ${label}?`}
        description="This can't be undone. Records that are already in use, such as a course with registrations, can't be deleted."
        confirmLabel="Delete"
        destructive
        onConfirm={() => remove.mutateAsync()}
      />
    </>
  )
}
