import { GraduationCap, LoaderCircle } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router'

import { useAuth } from '@/auth/useAuth'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ApiError } from '@/lib/api'
import { ROLE_HOME } from '@/lib/roles'
import { cn } from '@/lib/utils'

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
    <main className="flex min-h-svh items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="flex size-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <GraduationCap className="size-5" />
          </span>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Sign in to UEMP Portal</h1>
            <p className="text-sm text-muted-foreground">Use your university email address.</p>
          </div>
        </div>

        <Card className="shadow-none">
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
          <p className="text-center text-xs text-muted-foreground">
            Demo accounts · password <code className="font-medium">{DEMO_PASSWORD}</code>
          </p>
          <div className="divide-y rounded-lg border bg-card">
            {DEMO_ACCOUNTS.map((account) => (
              <button
                key={account.email}
                type="button"
                onClick={() => {
                  setEmail(account.email)
                  setPassword(DEMO_PASSWORD)
                }}
                className={cn(
                  'flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm transition-colors hover:bg-muted',
                  email === account.email && 'bg-accent',
                )}
              >
                <span className="font-medium">{account.label}</span>
                <span className="truncate text-xs text-muted-foreground">{account.email}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </main>
  )
}
