import { LoaderCircle } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { api, ApiError, type FieldErrors } from '@/lib/api'

export function ChangePasswordCard() {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [errors, setErrors] = useState<FieldErrors>({})
  const [saving, setSaving] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (next !== confirm) {
      setErrors({ confirm: 'The new passwords don’t match.' })
      return
    }
    setErrors({})
    setSaving(true)
    try {
      await api('/auth/password/', {
        method: 'POST',
        body: { current_password: current, new_password: next },
      })
      setCurrent('')
      setNext('')
      setConfirm('')
      toast.success('Password changed.')
    } catch (error) {
      if (error instanceof ApiError && Object.keys(error.fieldErrors).length) {
        setErrors(error.fieldErrors)
      } else {
        toast.error(error instanceof Error ? error.message : 'Could not change your password.')
      }
    } finally {
      setSaving(false)
    }
  }

  const fields = [
    { id: 'current_password', label: 'Current password', value: current, set: setCurrent },
    { id: 'new_password', label: 'New password', value: next, set: setNext },
    { id: 'confirm', label: 'Confirm new password', value: confirm, set: setConfirm },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle>Change password</CardTitle>
        <CardDescription>
          At least 8 characters, not all numbers, and not too similar to your name or email.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-4">
          {fields.map((field) => (
            <div key={field.id} className="space-y-2">
              <Label htmlFor={field.id}>{field.label}</Label>
              <Input
                id={field.id}
                type="password"
                autoComplete={field.id === 'current_password' ? 'current-password' : 'new-password'}
                value={field.value}
                onChange={(event) => field.set(event.target.value)}
                aria-invalid={Boolean(errors[field.id])}
                required
              />
              {errors[field.id] && <p className="text-xs text-destructive">{errors[field.id]}</p>}
            </div>
          ))}
          <Button type="submit" disabled={saving}>
            {saving && <LoaderCircle className="animate-spin" />}
            Change password
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
