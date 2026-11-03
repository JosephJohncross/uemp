export type Role = 'STUDENT' | 'LECTURER' | 'DEPT_ADMIN' | 'SUPER_ADMIN'
export type UserStatus = 'ACTIVE' | 'SUSPENDED' | 'DEACTIVATED'
export type SheetStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'RETURNED'
export type Term = 'FIRST' | 'SECOND'

export interface Paginated<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

export interface User {
  id: number
  email: string
  first_name: string
  last_name: string
  full_name: string
  role: Role
  status: UserStatus
  last_login: string | null
  date_joined: string
}

export interface StudentProfile {
  id: number
  matric_number: string
  program: number
  program_name: string
  department: number
  department_name: string
  faculty_name: string
  level: number
  phone: string
  address: string
}

export interface StaffProfile {
  id: number
  staff_id: string
  department: number
  department_name: string
  title: string
  phone: string
}

export interface Me extends User {
  student_profile: StudentProfile | null
  staff_profile: StaffProfile | null
}

export interface Student extends StudentProfile {
  user_id: number
  email: string
  first_name: string
  last_name: string
  status: UserStatus
}

export interface Staff extends StaffProfile {
  user_id: number
  email: string
  first_name: string
  last_name: string
  status: UserStatus
  role: Role
}

export interface Faculty {
  id: number
  name: string
  code: string
}

export interface Department {
  id: number
  faculty: number
  faculty_name: string
  name: string
  code: string
}

export interface Program {
  id: number
  department: number
  department_name: string
  name: string
  code: string
  duration_years: number
  max_level: number
}

export interface Semester {
  id: number
  session: number
  session_name: string
  term: Term
  label: string
  is_current: boolean
  registration_open: boolean
}

export interface AcademicSession {
  id: number
  name: string
  start_date: string
  end_date: string
  semesters: Semester[]
}

export interface Course {
  id: number
  department: number
  department_name: string
  code: string
  title: string
  units: number
  level: number
  term: Term
  programs: number[]
  program_codes: string[]
  is_active: boolean
}

export interface CourseSummary {
  id: number
  code: string
  title: string
  units: number
  level: number
  term: Term
  department_name: string
}

export interface Allocation {
  id: number
  course: number
  course_detail: Course
  semester: number
  semester_label: string
  lecturer: number
  lecturer_name: string
  assigned_at: string
  registered_count: number
  result_sheet: number | null
  result_status: SheetStatus | null
}

export interface Registration {
  id: number
  student: number
  matric_number: string
  student_name: string
  student_level: number
  program_name: string
  course: CourseSummary
  semester: number
  semester_label: string
  registered_at: string
}

export interface AvailableCourse extends CourseSummary {
  registered: boolean
}

export interface AvailableCourses {
  semester: Semester
  max_units: number
  registered_units: number
  courses: AvailableCourse[]
}

export interface MyRegistrations {
  semester: Semester
  total_units: number
  registrations: Registration[]
}

export interface ResultSheet {
  id: number
  course: CourseSummary
  department: number
  semester: number
  semester_label: string
  status: SheetStatus
  lecturer_name: string | null
  registered_count: number
  submitted_by_name: string | null
  submitted_at: string | null
  reviewed_by_name: string | null
  reviewed_at: string | null
  review_comment: string
  updated_at: string
}

export interface ScoreRow {
  registration: number
  matric_number: string
  student_name: string
  level: number
  program_name: string
  ca_score: number | null
  exam_score: number | null
  total: number | null
  grade: string
  grade_point: number | null
}

export interface SheetSummary {
  registered: number
  graded: number
  average: number | null
  highest: number | null
  lowest: number | null
  passed: number
  grade_distribution: Record<string, number>
}

export interface AuditEntry {
  id: number
  actor: number | null
  actor_email: string | null
  actor_name: string | null
  actor_role: Role | null
  action: string
  target_type: string
  target_id: string
  summary: string
  details: Record<string, unknown>
  created_at: string
}

export interface ResultSheetDetail extends ResultSheet {
  rows: ScoreRow[]
  summary: SheetSummary
  history: AuditEntry[]
}

export interface StudentScore {
  course: CourseSummary
  ca_score: number
  exam_score: number
  total: number
  grade: string
  grade_point: number
}

export interface SemesterResult {
  semester: number
  semester_label: string
  scores: StudentScore[]
  total_units: number
  gpa: string
}

export interface StudentResults {
  semesters: SemesterResult[]
  total_units: number
  cgpa: string
}

export interface Overview {
  semester: string | null
  students: number
  active_students: number
  lecturers: number
  courses: number
  programs: number
  faculties?: number
  departments?: number
  users_by_status?: Partial<Record<UserStatus, number>>
  registrations?: number
  students_registered?: number
  result_sheets?: Record<SheetStatus, number>
  by_department?: DepartmentStats[]
}

export interface DepartmentStats {
  id: number
  name: string
  code: string
  faculty: string
  students: number
  courses: number
  lecturers: number
  pending_results: number
}

export interface CourseReportRow {
  course: number
  code: string
  title: string
  units: number
  level: number
  department: string
  lecturer: string | null
  registered: number
  result_status: SheetStatus | null
  result_sheet: number | null
  graded: number
  average: number | null
  pass_rate: number | null
}

export interface CourseReport {
  semester: string
  courses: CourseReportRow[]
}
