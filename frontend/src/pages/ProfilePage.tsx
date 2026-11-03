import { LoaderCircle } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { useCurrentUser } from '@/auth/useAuth'
import { PageHeader } from '@/components/PageHeader'
import { StatusBadge } from '@/components/StatusBadge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { api, ApiError } from '@/lib/api'
import { ROLE_LABEL } from '@/lib/roles'
import type { Me } from '@/lib/types'

export default function ProfilePage() {
  const user = useCurrentUser()
  const queryClient = useQueryClient()
  const student = user.student_profile
  const staff = user.staff_profile
  const [phone, setPhone] = useState(student?.phone ?? staff?.phone ?? '')
  const [address, setAddress] = useState(student?.address ?? '')
  const [saving, setSaving] = useState(false)

  const details: [string, string][] = [
    ['Name', user.full_name],
    ['Email', user.email],
    ['Role', ROLE_LABEL[user.role]],
    ...(student
      ? ([
          ['Matric number', student.matric_number],
          ['Program', student.program_name],
          ['Department', student.department_name],
          ['Faculty', student.faculty_name],
          ['Level', `${student.level} level`],
        ] as [string, string][])
      : []),
    ...(staff
      ? ([
          ['Staff ID', staff.staff_id],
          ['Department', staff.department_name],
        ] as [string, string][])
      : []),
  ]

  async function save(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    try {
      const body = student ? { phone, address } : { phone }
      const me = await api<Me>('/auth/me/', { method: 'PATCH', body })
      queryClient.setQueryData(['auth', 'me'], me)
      toast.success('Contact details updated.')
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Could not save your details.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <PageHeader title="Profile" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Account <StatusBadge status={user.status} />
            </CardTitle>
            <CardDescription>
              These details are managed by the university. Contact your department to change them.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              {details.map(([label, value]) => (
                <div key={label}>
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd className="font-medium break-words">{value}</dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>

        {(student || staff) && (
          <Card>
            <CardHeader>
              <CardTitle>Contact details</CardTitle>
              <CardDescription>You can keep these up to date yourself.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={save} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    maxLength={20}
                  />
                </div>
                {student && (
                  <div className="space-y-2">
                    <Label htmlFor="address">Address</Label>
                    <Textarea
                      id="address"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      maxLength={255}
                      rows={3}
                    />
                  </div>
                )}
                <Button type="submit" disabled={saving}>
                  {saving && <LoaderCircle className="animate-spin" />}
                  Save changes
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  )
}
