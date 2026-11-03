import { GraduationCap, LoaderCircle } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router'

import { useAuth } from '@/auth/useAuth'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ApiError } from '@/lib/api'
import { ROLE_HOME } from '@/lib/roles'

const DEMO_PASSWORD = 'Uemp@2026'
const DEMO_ACCOUNTS = [
  { label: 'Student', email: 'tobi.ade@uemp.test' },
  { label: 'Student (100L, unregistered)', email: 'kemi.alabi@uemp.test' },
  { label: 'Lecturer', email: 'a.okafor@uemp.test' },
  { label: 'Department admin', email: 'csc.admin@uemp.test' },
  { label: 'Super admin', email: 'superadmin@uemp.test' },
]

export default function LoginPage() {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (user) return <Navigate to={ROLE_HOME[user.role]} replace />

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const me = await login(email, password)
      const from = (location.state as { from?: string } | null)?.from
      const home = ROLE_HOME[me.role]
      navigate(from?.startsWith(home) ? from : home, { replace: true })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not reach the server.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <aside className="hidden flex-col justify-between bg-primary p-10 text-primary-foreground lg:flex">
        <div className="flex items-center gap-2 text-lg font-semibold">
          <GraduationCap className="size-6" />
          UEMP University Portal
        </div>
        <div className="space-y-3">
          <p className="text-3xl font-semibold leading-tight">
            Registration, results and records in one place.
          </p>
          <p className="text-primary-foreground/70">
            Students register courses and track results. Lecturers submit scores. Departments review
            and approve them.
          </p>
        </div>
        <p className="text-sm text-primary-foreground/60">Academic management system</p>
      </aside>

      <main className="flex items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-sm space-y-6">
          <div className="flex items-center gap-2 font-semibold lg:hidden">
            <GraduationCap className="size-5" />
            UEMP University Portal
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Sign in</CardTitle>
              <CardDescription>Use your university email address.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="username"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting && <LoaderCircle className="animate-spin" />}
                  Sign in
                </Button>
              </form>
            </CardContent>
          </Card>

          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">
              Demo accounts (password {DEMO_PASSWORD})
            </p>
            <div className="flex flex-wrap gap-2">
              {DEMO_ACCOUNTS.map((account) => (
                <Button
                  key={account.email}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEmail(account.email)
                    setPassword(DEMO_PASSWORD)
                  }}
                >
                  {account.label}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
