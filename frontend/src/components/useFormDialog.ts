import { useState } from 'react'

/** Open/close state for a create-or-edit dialog; `editing` is null when creating. */
export function useFormDialog<T>() {
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<T | null>(null)

  return {
    open,
    editing,
    openCreate: () => {
      setEditing(null)
      setOpen(true)
    },
    openEdit: (item: T) => {
      setEditing(item)
      setOpen(true)
    },
    setOpen,
  }
}
