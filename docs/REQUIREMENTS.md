# Requirements checklist

How each point in the assessment brief is met. "UI" names the screen in the frontend.

## 2. Roles and permissions

### A. Student

| Requirement | Where |
|---|---|
| Log in securely to their dashboard | Session login, CSRF, throttling; UI *Dashboard* |
| View and update permitted profile information | `PATCH /api/auth/me/` (phone, address only); UI *Profile* |
| View department, faculty, program, matric number | `GET /api/auth/me/`; UI *Dashboard*, *Profile* |
| View available courses for program and level | `GET /api/student/registration/available/` |
| Register courses for the current semester | `POST /api/student/registration/` |
| View registered courses and units | `GET /api/student/registration/`; UI *Course registration* |
| View results and semester grades | `GET /api/student/results/`; UI *Results* |
| View academic history and CGPA | same, grouped by semester with GPA and CGPA |
| Download or print registration summary and result statement | PDF from `/api/student/registration/slip/` and `/api/student/results/statement/` (D17) |
| Cannot register other students | Student endpoints take no student ID; the student comes from the session (D15) |
| Cannot upload or modify results | Result endpoints require lecturer/admin roles |
| Cannot access lecturer or admin dashboards | API role checks; UI route guard |
| Cannot modify academic records or grades | Profile update accepts only phone and address |

### B. Lecturer

| Requirement | Where |
|---|---|
| Log in to lecturer dashboard | UI *My courses* |
| View and manage assigned courses | `GET /api/allocations/` (own only) |
| View registered students / class lists | Result sheet rows; UI *Class list & results*; PDF class list |
| Enter CA and exam scores | `PUT /api/result-sheets/{id}/scores/` |
| Save results as drafts | Same endpoint; sheet stays `DRAFT` |
| Submit for departmental review | `POST .../submit/` |
| View submission status and feedback | Status, review comment and history on the sheet |
| View course and student performance summaries | Sheet summary: average, high/low, pass rate, grade spread, per-student grades |
| Only manage courses assigned to them | Queryset scoped to allocations (404 otherwise) |
| Cannot modify courses or students outside their department | No write access to courses or students |
| Submitted results not editable without authorized reopening | Edits allowed only in `DRAFT`/`RETURNED`; reopen is a dept-admin action |
| Cannot approve own results | Lecturers can't call approve; reviewers can't approve their own submission |

### C. Department admin

| Requirement | Where |
|---|---|
| Departmental dashboard | `GET /api/reports/overview/` scoped; UI *Dashboard* |
| Register and manage students in department | `/api/students/`; UI *Students* |
| Create and manage lecturer profiles | `/api/staff/` (lecturers only); UI *Lecturers* |
| Create and manage departmental courses | `/api/courses/`; UI *Courses* |
| Assign lecturers to courses | `POST /api/allocations/`; UI *Course allocation* |
| Manage academic levels and programs | `/api/programs/` (duration sets the levels); student level edits |
| View student course registrations | `/api/registrations/`; UI *Registrations* |
| Review, approve or reject results | `approve` / `reject` actions; UI *Result approvals* |
| Return results for correction | `reject` with a required comment → `RETURNED` |
| Basic departmental reports | `/api/reports/courses/`; UI *Reports*; PDF export |
| Only their own department | Queryset scoping + `ensure_department_access()` |
| No super admin functions or system settings | `IsSuperAdmin` on users, audit log, faculties, sessions |

### D. Super admin

| Requirement | Where |
|---|---|
| University-wide dashboard | UI *Dashboard*: totals, per-department breakdown, recent activity |
| Faculties and departments | UI *Faculties & departments* (create, edit, delete when unused) |
| Academic programs | UI *Programs* |
| Student and lecturer accounts | UI *Students*, *Staff* |
| Academic sessions and semesters | UI *Sessions & semesters*: create, set current, open/close registration |
| Courses and allocations | UI *Courses*, *Course allocation* |
| Activate, deactivate, suspend accounts | UI *User accounts*; suspension ends live sessions |
| Manage roles and permissions | Lecturer ↔ department admin swaps; permissions are fixed per role (D3) |
| Monitor course registrations | UI *Registrations* across all departments |
| Oversee departmental result approvals | UI *Result approvals*, read-only by design (see §5 of the architecture doc) |
| University-wide academic reports | UI *Reports* |
| Monitor system activity and admin actions | UI *Audit log* |

## 3. Core modules

| Module | Backend | Frontend |
|---|---|---|
| Authentication | `accounts` login/logout/me/password | Login page, role redirect, sign-out |
| Student management | `StudentProfile`, `/api/students/` | *Students* |
| Lecturer management | `StaffProfile`, `/api/staff/`, `/api/allocations/` | *Lecturers* / *Staff*, *Course allocation* |
| Faculty & department management | `/api/faculties/`, `/api/departments/` | *Faculties & departments* |
| Course management | `Course` (code, title, units, level, term, programs) | *Courses* |
| Course registration | `registration` app | *Course registration* |
| Result management | `Score`, `grading.py` | Result sheet page |
| Result approval | `ResultSheet` state machine | *Result approvals* |
| Academic session management | `AcademicSession`, `Semester` | *Sessions & semesters* |
| Reports | `reports` app, PDF documents | *Reports*, downloadable student list and course report |
| Admin dashboard | `/api/reports/overview/` | Super admin *Dashboard* |

## 4. Workflows

| Workflow | Step-by-step in the app |
|---|---|
| 1. Student course registration | README "Trying the main workflows" |
| 2. Lecturer result submission | same |
| 3. Departmental result approval | same |
| 4. Super admin management | same |

## 5. Technical requirements

| Requirement | How |
|---|---|
| RBAC | Three layers: role class, scoped queryset, service rule (architecture §5) |
| Secure authentication and sessions | HttpOnly SameSite session cookie, CSRF on login, throttling, 8-hour sessions, HSTS |
| Backend validation of permissions | Every endpoint checks role and scope; the UI guard is only navigation |
| Database relationships | ER diagram and relationship table in `docs/DATABASE.md` |
| Validation and duplicate prevention | Serializers, plus unique and check constraints in the database |
| Secure storage of academic records | `PROTECT` foreign keys, results editable only in allowed states, approved-only visibility |
| Audit trails | `AuditLog` on every result step with before/after scores; per-sheet history |
| Responsive UI | Tailwind layouts, mobile navigation drawer, no horizontal scroll at 375 px |
| Error handling and feedback | API errors mapped to fields and toasts; 409 for in-use deletes; per-page error boundary |
| Clean, maintainable code | One app per domain, thin views, services for rules, ruff and oxlint clean |

## 6. Business rules

| Rule | Enforced in |
|---|---|
| 1. Register only courses for own program, level, semester | `registration.services.available_courses` |
| 2. No duplicate registration in a semester | Service check + unique constraint |
| 3. Lecturers enter results only for assigned courses | `_ensure_allocated_lecturer` + scoped queryset |
| 4. Submitted before approval | `TRANSITIONS` table |
| 5. Only the department's admin approves | `_ensure_department_reviewer` |
| 6. Students see only approved results | `student_results()` filters `APPROVED` |
| 7. Super admin has university-wide access | No scope filter for super admin |
| 8. Result actions are traceable | `audit.record()` on every save and transition |
| GPA on a documented, configurable scale | `GRADING_SCALE` in settings; README and architecture §7 |

## 7. Deliverables

| Deliverable | Where |
|---|---|
| Functional portal | `frontend/` + `backend/`; live URLs in the README once deployed |
| Dashboards for all four roles | `/student`, `/lecturer`, `/department`, `/admin` |
| Source code | This repository |
| Database schema / ER diagram | `docs/DATABASE.md`, with the diagram as `docs/er-diagram.png` and `.svg` |
| README with setup | `README.md` |
| Test credentials | `README.md` and one-click buttons on the login page |
| Technical documentation | `docs/ARCHITECTURE.md` |
| Demonstration | Recorded separately |
| Sample data | `python manage.py seed_demo`, run on every deploy |
