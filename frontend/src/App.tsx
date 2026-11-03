import { Navigate, Route, Routes } from 'react-router'

import { RequireRole } from '@/auth/RequireRole'
import { useAuth } from '@/auth/useAuth'
import { AppLayout } from '@/layouts/AppLayout'
import { ROLE_HOME } from '@/lib/roles'
import LoginPage from '@/pages/LoginPage'
import AllocationsPage from '@/pages/manage/AllocationsPage'
import CoursesPage from '@/pages/manage/CoursesPage'
import DepartmentDashboard from '@/pages/manage/DepartmentDashboard'
import ProgramsPage from '@/pages/manage/ProgramsPage'
import RegistrationsPage from '@/pages/manage/RegistrationsPage'
import ReportsPage from '@/pages/manage/ReportsPage'
import StaffPage from '@/pages/manage/StaffPage'
import StudentsPage from '@/pages/manage/StudentsPage'
import LecturerDashboard from '@/pages/lecturer/LecturerDashboard'
import ProfilePage from '@/pages/ProfilePage'
import ResultSheetListPage from '@/pages/results/ResultSheetListPage'
import ResultSheetPage from '@/pages/results/ResultSheetPage'
import CourseRegistrationPage from '@/pages/student/CourseRegistrationPage'
import ResultsPage from '@/pages/student/ResultsPage'
import StudentDashboard from '@/pages/student/StudentDashboard'

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

      <Route path="*" element={<HomeRedirect />} />
    </Routes>
  )
}
