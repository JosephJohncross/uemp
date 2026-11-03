import { lazy } from 'react'
import { Navigate, Route, Routes } from 'react-router'

import { RequireRole } from '@/auth/RequireRole'
import { useAuth } from '@/auth/useAuth'
import { AppLayout } from '@/layouts/AppLayout'
import { ROLE_HOME } from '@/lib/roles'
import LoginPage from '@/pages/LoginPage'

// Each page is its own chunk, so a role only downloads the screens it can open.
const AdminDashboard = lazy(() => import('@/pages/admin/AdminDashboard'))
const AuditLogPage = lazy(() => import('@/pages/admin/AuditLogPage'))
const SessionsPage = lazy(() => import('@/pages/admin/SessionsPage'))
const StructurePage = lazy(() => import('@/pages/admin/StructurePage'))
const UsersPage = lazy(() => import('@/pages/admin/UsersPage'))
const AllocationsPage = lazy(() => import('@/pages/manage/AllocationsPage'))
const CoursesPage = lazy(() => import('@/pages/manage/CoursesPage'))
const DepartmentDashboard = lazy(() => import('@/pages/manage/DepartmentDashboard'))
const ProgramsPage = lazy(() => import('@/pages/manage/ProgramsPage'))
const RegistrationsPage = lazy(() => import('@/pages/manage/RegistrationsPage'))
const ReportsPage = lazy(() => import('@/pages/manage/ReportsPage'))
const StaffPage = lazy(() => import('@/pages/manage/StaffPage'))
const StudentsPage = lazy(() => import('@/pages/manage/StudentsPage'))
const LecturerDashboard = lazy(() => import('@/pages/lecturer/LecturerDashboard'))
const ProfilePage = lazy(() => import('@/pages/ProfilePage'))
const ResultSheetListPage = lazy(() => import('@/pages/results/ResultSheetListPage'))
const ResultSheetPage = lazy(() => import('@/pages/results/ResultSheetPage'))
const CourseRegistrationPage = lazy(() => import('@/pages/student/CourseRegistrationPage'))
const ResultsPage = lazy(() => import('@/pages/student/ResultsPage'))
const StudentDashboard = lazy(() => import('@/pages/student/StudentDashboard'))

function HomeRedirect() {
  const { user } = useAuth()
  return <Navigate to={user ? ROLE_HOME[user.role] : '/login'} replace />
}

export default function App() {
  const { isLoading } = useAuth()
  if (isLoading) return null

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<RequireRole role="STUDENT" />}>
        <Route path="/student" element={<AppLayout />}>
          <Route index element={<StudentDashboard />} />
          <Route path="registration" element={<CourseRegistrationPage />} />
          <Route path="results" element={<ResultsPage />} />
          <Route path="profile" element={<ProfilePage />} />
        </Route>
      </Route>

      <Route element={<RequireRole role="LECTURER" />}>
        <Route path="/lecturer" element={<AppLayout />}>
          <Route index element={<LecturerDashboard />} />
          <Route path="results" element={<ResultSheetListPage />} />
          <Route path="results/:sheetId" element={<ResultSheetPage />} />
          <Route path="profile" element={<ProfilePage />} />
        </Route>
      </Route>

      <Route element={<RequireRole role="DEPT_ADMIN" />}>
        <Route path="/department" element={<AppLayout />}>
          <Route index element={<DepartmentDashboard />} />
          <Route path="results" element={<ResultSheetListPage />} />
          <Route path="results/:sheetId" element={<ResultSheetPage />} />
          <Route path="students" element={<StudentsPage />} />
          <Route path="staff" element={<StaffPage />} />
          <Route path="programs" element={<ProgramsPage />} />
          <Route path="courses" element={<CoursesPage />} />
          <Route path="allocations" element={<AllocationsPage />} />
          <Route path="registrations" element={<RegistrationsPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="profile" element={<ProfilePage />} />
        </Route>
      </Route>

      <Route element={<RequireRole role="SUPER_ADMIN" />}>
        <Route path="/admin" element={<AppLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="structure" element={<StructurePage />} />
          <Route path="programs" element={<ProgramsPage />} />
          <Route path="sessions" element={<SessionsPage />} />
          <Route path="users" element={<UsersPage />} />
          <Route path="students" element={<StudentsPage />} />
          <Route path="staff" element={<StaffPage />} />
          <Route path="courses" element={<CoursesPage />} />
          <Route path="allocations" element={<AllocationsPage />} />
          <Route path="registrations" element={<RegistrationsPage />} />
          <Route path="results" element={<ResultSheetListPage />} />
          <Route path="results/:sheetId" element={<ResultSheetPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="audit" element={<AuditLogPage />} />
          <Route path="profile" element={<ProfilePage />} />
        </Route>
      </Route>

      <Route path="*" element={<HomeRedirect />} />
    </Routes>
  )
}
