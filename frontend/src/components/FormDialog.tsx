import { LoaderCircle } from 'lucide-react'
import { useState, type FormEvent, type ReactNode } from 'react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ApiError, type FieldErrors } from '@/lib/api'

export type FormValues = Record<string, string>

export interface FieldConfig {
  name: string
  label: string
  type?: 'text' | 'email' | 'password' | 'number' | 'date' | 'select'
  options?: { value: string | number; label: string }[]
  required?: boolean
  placeholder?: string
  hint?: string
  /** Show only when creating, e.g. an initial password. */
  createOnly?: boolean
  /** Span both columns of the form grid. */
  wide?: boolean
}

interface FormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: ReactNode
  fields: FieldConfig[]
  initialValues?: FormValues
  isEditing?: boolean
  submitLabel?: string
  onSubmit: (values: FormValues) => Promise<unknown>
}

/**
 * The create/edit dialog shared by the admin screens. Field errors come straight
 * from the API's validation response, so the rules live in one place: the backend.
 */
export function FormDialog(props: FormDialogProps) {
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-lg">
        {/* Remounting on open resets the form to its initial values. */}
        {props.open && <FormDialogBody {...props} />}
      </DialogContent>
    </Dialog>
  )
}

function FormDialogBody({
  onOpenChange,
  title,
  description,
  fields,
  initialValues = {},
  isEditing = false,
  submitLabel = 'Save',
  onSubmit,
}: FormDialogProps) {
  const [values, setValues] = useState<FormValues>(initialValues)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const visibleFields = fields.filter((field) => !(isEditing && field.createOnly))

  function setValue(name: string, value: string) {
    setValues((current) => ({ ...current, [name]: value }))
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setErrors({})
    setFormError('')
    setSubmitting(true)
    try {
      await onSubmit(values)
      onOpenChange(false)
    } catch (error) {
      if (error instanceof ApiError && Object.keys(error.fieldErrors).length) {
        setErrors(error.fieldErrors)
      } else {
        setFormError(error instanceof Error ? error.message : 'Something went wrong.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        {description && <DialogDescription>{description}</DialogDescription>}
      </DialogHeader>

      {formError && <p className="text-sm text-destructive">{formError}</p>}

      <div className="grid gap-4 sm:grid-cols-2">
        {visibleFields.map((field) => (
          <div key={field.name} className={field.wide ? 'sm:col-span-2' : undefined}>
            <div className="space-y-2">
              <Label htmlFor={field.name}>{field.label}</Label>
              <FieldInput
                field={field}
                value={values[field.name] ?? ''}
                onChange={(value) => setValue(field.name, value)}
                invalid={Boolean(errors[field.name])}
              />
              {errors[field.name] ? (
                <p className="text-xs text-destructive">{errors[field.name]}</p>
              ) : (
                field.hint && <p className="text-xs text-muted-foreground">{field.hint}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting && <LoaderCircle className="animate-spin" />}
          {submitLabel}
        </Button>
      </DialogFooter>
    </form>
  )
}

interface FieldInputProps {
  field: FieldConfig
  value: string
  onChange: (value: string) => void
  invalid: boolean
}

function FieldInput({ field, value, onChange, invalid }: FieldInputProps) {
  if (field.type === 'select') {
    return (
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id={field.name} className="w-full" aria-invalid={invalid}>
          <SelectValue placeholder={field.placeholder ?? `Choose ${field.label.toLowerCase()}`} />
        </SelectTrigger>
        <SelectContent>
          {field.options?.map((option) => (
            <SelectItem key={option.value} value={String(option.value)}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    )
  }
  return (
    <Input
      id={field.name}
      type={field.type ?? 'text'}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      required={field.required}
      placeholder={field.placeholder}
      aria-invalid={invalid}
    />
  )
}
