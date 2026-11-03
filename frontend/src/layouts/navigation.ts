import {
  BookOpen,
  Building2,
  CalendarRange,
  ClipboardCheck,
  ClipboardList,
  FileBarChart,
  GraduationCap,
  History,
  LayoutDashboard,
  Library,
  ListChecks,
  ScrollText,
  ShieldCheck,
  UserCog,
  UserRound,
  Users,
  type LucideIcon,
} from 'lucide-react'

import type { Role } from '@/lib/types'

export interface NavItem {
  label: string
  to: string
  icon: LucideIcon
}

export interface NavSection {
  title?: string
  items: NavItem[]
}

export const NAVIGATION: Record<Role, NavSection[]> = {
  STUDENT: [
    {
      items: [
        { label: 'Dashboard', to: '/student', icon: LayoutDashboard },
        { label: 'Course registration', to: '/student/registration', icon: ClipboardList },
        { label: 'Results', to: '/student/results', icon: ScrollText },
      ],
    },
    { title: 'Account', items: [{ label: 'Profile', to: '/student/profile', icon: UserRound }] },
  ],
  LECTURER: [
    {
      items: [
        { label: 'My courses', to: '/lecturer', icon: BookOpen },
        { label: 'Result sheets', to: '/lecturer/results', icon: ClipboardCheck },
      ],
    },
    { title: 'Account', items: [{ label: 'Profile', to: '/lecturer/profile', icon: UserRound }] },
  ],
  DEPT_ADMIN: [
    {
      items: [
        { label: 'Dashboard', to: '/department', icon: LayoutDashboard },
        { label: 'Result approvals', to: '/department/results', icon: ClipboardCheck },
      ],
    },
    {
      title: 'People',
      items: [
        { label: 'Students', to: '/department/students', icon: GraduationCap },
        { label: 'Lecturers', to: '/department/staff', icon: Users },
      ],
    },
    {
      title: 'Academics',
      items: [
        { label: 'Programs', to: '/department/programs', icon: Library },
        { label: 'Courses', to: '/department/courses', icon: BookOpen },
        { label: 'Course allocation', to: '/department/allocations', icon: ListChecks },
        { label: 'Registrations', to: '/department/registrations', icon: ClipboardList },
        { label: 'Reports', to: '/department/reports', icon: FileBarChart },
      ],
    },
    { title: 'Account', items: [{ label: 'Profile', to: '/department/profile', icon: UserRound }] },
  ],
  SUPER_ADMIN: [
    {
      items: [
        { label: 'Dashboard', to: '/admin', icon: LayoutDashboard },
        { label: 'Result approvals', to: '/admin/results', icon: ClipboardCheck },
        { label: 'Reports', to: '/admin/reports', icon: FileBarChart },
      ],
    },
    {
      title: 'University',
      items: [
        { label: 'Faculties & departments', to: '/admin/structure', icon: Building2 },
        { label: 'Programs', to: '/admin/programs', icon: Library },
        { label: 'Sessions & semesters', to: '/admin/sessions', icon: CalendarRange },
      ],
    },
    {
      title: 'People',
      items: [
        { label: 'User accounts', to: '/admin/users', icon: ShieldCheck },
        { label: 'Students', to: '/admin/students', icon: GraduationCap },
        { label: 'Staff', to: '/admin/staff', icon: UserCog },
      ],
    },
    {
      title: 'Teaching',
      items: [
        { label: 'Courses', to: '/admin/courses', icon: BookOpen },
        { label: 'Course allocation', to: '/admin/allocations', icon: ListChecks },
        { label: 'Registrations', to: '/admin/registrations', icon: ClipboardList },
      ],
    },
    {
      title: 'Oversight',
      items: [
        { label: 'Audit log', to: '/admin/audit', icon: History },
        { label: 'Profile', to: '/admin/profile', icon: UserRound },
      ],
    },
  ],
}
