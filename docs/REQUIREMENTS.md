# Requirements checklist

How each point in the assessment brief is met. Tests live under `backend/apps/*/tests/`;
"UI" names the screen in the frontend.

## 2. Roles and permissions

### A. Student

| Requirement | Where | Verified by |
|---|---|---|
| Log in securely to their dashboard | Session login, CSRF, throttling; UI *Dashboard* | `test_auth.py` |
| View and update permitted profile information | `PATCH /api/auth/me/` (phone, address only); UI *Profile* | `test_student_can_update_only_contact_details` |
| View department, faculty, program, matric number | `GET /api/auth/me/`; UI *Dashboard*, *Profile* | `test_login_returns_profile_and_starts_session` |
| View available courses for program and level | `GET /api/student/registration/available/` | `test_available_courses_match_program_level_and_term` |
| Register courses for the current semester | `POST /api/student/registration/` | `test_student_registers_courses_and_sees_them` |
| View registered courses and units | `GET /api/student/registration/`; UI *Course registration* | same |
| View results and semester grades | `GET /api/student/results/`; UI *Results* | `test_students_see_only_approved_results` |
| View academic history and CGPA | same, grouped by semester with GPA and CGPA | `test_cgpa_weights_results_by_course_units` |
| Print registration summary and result statement | UI *Print registration slip*, *Print statement* (print stylesheet, D17) | manual |
| Cannot register other students | Student endpoints take no student ID; the student comes from the session (D15) | `test_student_cannot_register_someone_else` |
| Cannot upload or modify results | Result endpoints require lecturer/admin roles | `test_access_matrix.py` |
| Cannot access lecturer or admin dashboards | API role checks; UI route guard | `test_access_matrix.py` |
| Cannot modify academic records or grades | Profile update accepts only phone and address | `test_student_can_update_only_contact_details` |

### B. Lecturer

| Requirement | Where | Verified by |
|---|---|---|
| Log in to lecturer dashboard | UI *My courses* | `test_access_matrix.py` |
| View and manage assigned courses | `GET /api/allocations/` (own only) | `test_lecturer_sees_only_own_allocations` |
| View registered students / class lists | Result sheet rows; UI *Class list & results*, printable | `test_lecturer_sees_class_list_with_empty_scores` |
| Enter CA and exam scores | `PUT /api/result-sheets/{id}/scores/` | `test_saving_scores_computes_total_and_grade` |
| Save results as drafts | Same endpoint; sheet stays `DRAFT` | same |
| Submit for departmental review | `POST .../submit/` | `test_incomplete_sheet_cannot_be_submitted`, `fill_and_submit` |
| View submission status and feedback | Status, review comment and history on the sheet | `test_rejection_requires_feedback_and_reopens_editing` |
| View course and student performance summaries | Sheet summary: average, high/low, pass rate, grade spread, per-student grades | manual |
| Only manage courses assigned to them | Queryset scoped to allocations (404 otherwise) | `test_lecturer_not_allocated_cannot_see_or_edit_sheet` |
| Cannot modify courses or students outside their department | No write access to courses or students | `test_writes_refused_for_roles_without_authority` |
| Submitted results not editable without authorized reopening | Edits allowed only in `DRAFT`/`RETURNED`; reopen is a dept-admin action | `test_submitted_sheet_is_locked_for_the_lecturer`, `test_reopening_hides_results_until_reapproved` |
| Cannot approve own results | Lecturers can't call approve; reviewers can't approve their own submission | `test_only_owning_department_admin_can_review`, `test_admin_cannot_approve_results_they_submitted` |

### C. Department admin

| Requirement | Where | Verified by |
|---|---|---|
| Departmental dashboard | `GET /api/reports/overview/` scoped; UI *Dashboard* | manual |
| Register and manage students in department | `/api/students/`; UI *Students* | `test_user_management.py` |
| Create and manage lecturer profiles | `/api/staff/` (lecturers only); UI *Lecturers* | `test_dept_admin_can_create_lecturer_but_not_another_admin` |
| Create and manage departmental courses | `/api/courses/`; UI *Courses* | `test_dept_admin_cannot_edit_another_departments_course` |
| Assign lecturers to courses | `POST /api/allocations/`; UI *Course allocation* | `test_academics.py` |
| Manage academic levels and programs | `/api/programs/` (duration sets the levels); student level edits | `test_student_creation_validation` (level bound) |
| View student course registrations | `/api/registrations/`; UI *Registrations* | `test_dept_admin_sees_registrations_for_own_students_and_courses` |
| Review, approve or reject results | `approve` / `reject` actions; UI *Result approvals* | `test_result_workflow.py` |
| Return results for correction | `reject` with a required comment → `RETURNED` | `test_rejection_requires_feedback_and_reopens_editing` |
| Basic departmental reports | `/api/reports/courses/`; UI *Reports* (printable) | manual |
| Only their own department | Queryset scoping + `ensure_department_access()` | `test_dept_admin_gets_404_for_another_departments_student`, `test_dept_admin_cannot_create_student_in_another_department` |
| No super admin functions or system settings | `IsSuperAdmin` on users, audit log, faculties, sessions | `test_access_matrix.py` |

### D. Super admin

| Requirement | Where |
|---|---|
| University-wide dashboard | UI *Dashboard*: totals, per-department breakdown, recent activity |
| Faculties and departments | UI *Faculties & departments* (create, edit, delete when unused) |
| Academic programs | UI *Programs* |
| Student and lecturer accounts | UI *Students*, *Staff* |
| Academic sessions and semesters | UI *Sessions & semesters*: create, set current, open/close registration |
| Courses and allocations | UI *Courses*, *Course allocation* |
| Activate, deactivate, suspend accounts | UI *User accounts*; suspension ends live sessions (`test_suspension_ends_an_existing_session`) |
| Manage roles and permissions | Lecturer ↔ department admin swaps (`test_role_swap_allowed_only_between_staff_roles`); permissions are fixed per role (D3) |
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
| Reports | `reports` app | *Reports*, printable student list |
| Admin dashboard | `/api/reports/overview/` | Super admin *Dashboard* |

## 4. Workflows

| Workflow | Step-by-step in the app | End-to-end test |
|---|---|---|
| 1. Student course registration | README "Trying the main workflows" | `test_registration.py` |
| 2. Lecturer result submission | same | `test_result_workflow.py` |
| 3. Departmental result approval | same | `test_result_workflow.py` |
| 4. Super admin management | same | `test_academics.py`, `test_user_management.py` |

## 5. Technical requirements

| Requirement | How |
|---|---|
| RBAC | Three layers: role class, scoped queryset, service rule (architecture §5) |
| Secure authentication and sessions | HttpOnly SameSite session cookie, CSRF on login, throttling, 8-hour sessions, HSTS |
| Backend validation of permissions | Every endpoint checks role and scope; the UI guard is only navigation |
| Database relationships | ER diagram, architecture §4 |
| Validation and duplicate prevention | Serializers, plus unique and check constraints in the database |
| Secure storage of academic records | `PROTECT` foreign keys, results editable only in allowed states, approved-only visibility |
| Audit trails | `AuditLog` on every result step with before/after scores; per-sheet history |
| Responsive UI | Tailwind layouts, mobile navigation drawer, no horizontal scroll at 375 px |
| Error handling and feedback | API errors mapped to fields and toasts; 409 for in-use deletes; per-page error boundary |
| Clean, maintainable code | One app per domain, thin views, services for rules, ruff and oxlint clean |

## 6. Business rules

| Rule | Enforced in | Test |
|---|---|---|
| 1. Register only courses for own program, level, semester | `registration.services.available_courses` | `test_courses_outside_program_level_or_term_are_refused` |
| 2. No duplicate registration in a semester | Service check + unique constraint | `test_duplicate_registration_is_refused` |
| 3. Lecturers enter results only for assigned courses | `_ensure_allocated_lecturer` + scoped queryset | `test_lecturer_not_allocated_cannot_see_or_edit_sheet` |
| 4. Submitted before approval | `TRANSITIONS` table | `test_results_cannot_be_approved_before_submission` |
| 5. Only the department's admin approves | `_ensure_department_reviewer` | `test_only_owning_department_admin_can_review` |
| 6. Students see only approved results | `student_results()` filters `APPROVED` | `test_students_see_only_approved_results` |
| 7. Super admin has university-wide access | No scope filter for super admin | `test_access_matrix.py` |
| 8. Result actions are traceable | `audit.record()` on every save and transition | `test_every_step_is_audited_with_score_changes` |
| GPA on a documented, configurable scale | `GRADING_SCALE` in settings; README and architecture §7 | `test_grading.py` |

## 7. Deliverables

| Deliverable | Where |
|---|---|
| Functional portal | `frontend/` + `backend/`; live URLs in the README once deployed |
| Dashboards for all four roles | `/student`, `/lecturer`, `/department`, `/admin` |
| Source code | This repository |
| Database schema / ER diagram | `docs/ARCHITECTURE.md` §4 (Mermaid, renders on GitHub) |
| README with setup | `README.md` |
| Test credentials | `README.md` and one-click buttons on the login page |
| Technical documentation | `docs/ARCHITECTURE.md` |
| Demonstration | Recorded separately |
| Sample data | `python manage.py seed_demo`, run on every deploy |
