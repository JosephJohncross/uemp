import { CalendarDays, GraduationCap, LogOut, Menu } from 'lucide-react'
import { Suspense, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router'

import { useCurrentUser, useAuth } from '@/auth/useAuth'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { useApiQuery } from '@/lib/queries'
import { ROLE_LABEL } from '@/lib/roles'
import type { Me, Semester } from '@/lib/types'
import { cn } from '@/lib/utils'

import { NAVIGATION, type NavItem } from './navigation'

function initialsOf(user: Me) {
  return `${user.first_name[0] ?? ''}${user.last_name[0] ?? ''}`
}

function Brand() {
  return (
    <div className="flex items-center gap-3 px-2">
      <span className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
        <GraduationCap className="size-4.5" />
      </span>
      <span className="font-semibold tracking-tight text-foreground">UEMP Portal</span>
    </div>
  )
}

/** The navigation item the current URL belongs to: the longest matching path wins. */
function useActiveItem(): NavItem | undefined {
  const user = useCurrentUser()
  const { pathname } = useLocation()
  return NAVIGATION[user.role]
    .flatMap((section) => section.items)
    .filter((item) => pathname === item.to || pathname.startsWith(`${item.to}/`))
    .sort((a, b) => b.to.length - a.to.length)[0]
}

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const user = useCurrentUser()
  const sections = NAVIGATION[user.role]
  const active = useActiveItem()

  return (
    <nav className="sidebar-scroll -mr-2 flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto pr-2">
      {sections.map((section, index) => (
        <div key={section.title ?? index} className="space-y-1">
          {section.title && (
            <p className="px-3 pb-1 text-xs font-medium text-muted-foreground">{section.title}</p>
          )}
          {section.items.map((item) => {
            const isActive = item.to === active?.to
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onNavigate}
                className={cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm text-sidebar-foreground transition-colors hover:bg-muted hover:text-foreground',
                  isActive &&
                    'bg-sidebar-accent font-medium text-sidebar-accent-foreground hover:bg-sidebar-accent',
                )}
              >
                <item.icon className="size-4" />
                {item.label}
              </NavLink>
            )
          })}
        </div>
      ))}
    </nav>
  )
}

function SidebarUser() {
  const user = useCurrentUser()
  const { logout } = useAuth()
  return (
    <div className="flex items-center gap-3 border-t px-2 pt-4">
      <Avatar className="size-9">
        <AvatarFallback className="bg-muted text-xs font-medium text-foreground">
          {initialsOf(user)}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1 leading-tight">
        <p className="truncate text-sm font-medium text-foreground">{user.full_name}</p>
        <p className="truncate text-xs text-muted-foreground">{ROLE_LABEL[user.role]}</p>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="text-muted-foreground"
        onClick={logout}
        aria-label="Sign out"
      >
        <LogOut />
      </Button>
    </div>
  )
}

function SidebarContents({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <>
      <Brand />
      <SidebarNav onNavigate={onNavigate} />
      <SidebarUser />
    </>
  )
}

function SemesterChip() {
  const { data: semester } = useApiQuery<Semester>('/semesters/current/')
  if (!semester) return null
  return (
    <div className="hidden items-center gap-2 rounded-md border bg-card px-3 py-1.5 text-xs md:flex">
      <CalendarDays className="size-3.5 text-primary" />
      <span className="font-medium">{semester.label}</span>
      <span className="h-3 w-px bg-border" />
      <span
        className={cn(
          'flex items-center gap-1.5',
          semester.registration_open ? 'text-emerald-700' : 'text-muted-foreground',
        )}
      >
        <span
          className={cn(
            'size-1.5 rounded-full',
            semester.registration_open ? 'bg-emerald-500' : 'bg-muted-foreground/50',
          )}
        />
        Registration {semester.registration_open ? 'open' : 'closed'}
      </span>
    </div>
  )
}

function UserMenu() {
  const user = useCurrentUser()
  const { logout } = useAuth()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-full" aria-label="Account menu">
          <Avatar className="size-8">
            <AvatarFallback className="bg-muted text-xs font-medium text-foreground">
              {initialsOf(user)}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="font-normal">
          <span className="block font-medium">{user.full_name}</span>
          <span className="block text-xs text-muted-foreground">{user.email}</span>
          <span className="mt-1 block text-xs text-primary">{ROLE_LABEL[user.role]}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={logout}>
          <LogOut />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function AppLayout() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const location = useLocation()
  const active = useActiveItem()

  return (
    <div className="flex min-h-svh bg-background">
      <aside className="sticky top-0 hidden h-svh w-64 shrink-0 flex-col gap-6 border-r bg-sidebar p-4 lg:flex">
        <SidebarContents />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex h-14 items-center justify-between gap-3 border-b bg-card px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-2">
            <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="lg:hidden"
                  aria-label="Open navigation"
                >
                  <Menu />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 gap-6 bg-sidebar p-4">
                <SheetTitle className="sr-only">Navigation</SheetTitle>
                <SidebarContents onNavigate={() => setMobileNavOpen(false)} />
              </SheetContent>
            </Sheet>
            {active && (
              <div className="flex min-w-0 items-center gap-2">
                <active.icon className="hidden size-4 text-muted-foreground sm:block" />
                <span className="truncate text-sm font-medium">{active.label}</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            <SemesterChip />
            <UserMenu />
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 space-y-6 p-4 sm:p-6 lg:p-8">
          <ErrorBoundary key={location.pathname}>
            <Suspense fallback={<Skeleton className="h-64 w-full" />}>
              <Outlet />
            </Suspense>
          </ErrorBoundary>
        </main>
      </div>
    </div>
  )
}
