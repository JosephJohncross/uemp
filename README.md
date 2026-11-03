# UEMP — University Management Portal

A web portal for a university's academic records, with four roles: students, lecturers,
department administrators and a super administrator. Students register courses and see their
results, lecturers enter and submit scores, departments review and approve them, and the
super admin runs the academic structure, sessions and user accounts.

- **Live app:** _add the Vercel URL here_
- **API:** _add the Render URL here_
- **Design and decisions:** [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md), which covers the
  architecture, ER diagram, permission model, security and the reasoning behind each choice.
- **Requirements checklist:** [docs/REQUIREMENTS.md](docs/REQUIREMENTS.md), which maps every point in the
  brief to the code and the test that proves it.

## Test accounts

Every demo account uses the password **`Uemp@2026`**. The login page also has one-click
buttons that fill these in.

| Role | Email | What's set up for them |
|---|---|---|
| Super admin | `superadmin@uemp.test` | Whole university |
| Department admin (Computer Science) | `csc.admin@uemp.test` | CSC201 results waiting for review |
| Department admin (Mathematics) | `mth.admin@uemp.test` | |
| Department admin (Electrical Eng.) | `eee.admin@uemp.test` | |
| Lecturer (CSC) | `a.okafor@uemp.test` | Teaches CSC101, CSC201 |
| Lecturer (CSC) | `b.adeyemi@uemp.test` | Teaches CSC103, CSC203 (draft, part-filled), CSC205 |
| Lecturer (MTH) | `c.bello@uemp.test` | Teaches MTH101, MTH103, MTH201 |
| Lecturer (EEE) | `d.yusuf@uemp.test` | Teaches EEE101 |
| Student, 200 level CSC | `tobi.ade@uemp.test` | Last session's results approved (CGPA 4.20), registered this semester |
| Student, 200 level CSC | `amaka.obi@uemp.test`, `sani.lawal@uemp.test` | Same as above |
| Student, 100 level CSC | `kemi.alabi@uemp.test`, `emeka.uche@uemp.test` | Not registered yet, so registration can be tried |
| Student, 100 level MTH / EEE | `zainab.musa@uemp.test`, `femi.oke@uemp.test` | Not registered yet |

## Trying the main workflows

**Course registration.** Sign in as `kemi.alabi@uemp.test` and open *Course registration*.
Only courses for her program, level and the current semester are listed. Register some, then
try *Print registration slip*. Sign in as `csc.admin@uemp.test` and the registrations appear
under *Registrations*.

**Result entry and approval.**
1. Sign in as `b.adeyemi@uemp.test`, open CSC203, fill in the missing exam scores, *Save draft*,
   then *Submit for review*. The sheet locks.
2. Sign in as `csc.admin@uemp.test`. CSC203 and CSC201 are waiting on the dashboard. *Return*
   one with a comment, or *Approve* it.
3. A returned sheet shows the comment to the lecturer, who can correct and resubmit it.
   An approved sheet can be *Reopened* by the department admin, which hides it from students again.
4. Sign in as `tobi.ade@uemp.test`. Approved results show under *Results* with GPA per
   semester and CGPA.

The history panel on each result sheet, and the super admin's *Audit log*, record every step,
including the before and after values of every score change.

**Super admin.** Under *Sessions & semesters* you can make a semester current and open or
close registration. Under *User accounts* you can suspend someone (they are signed out
immediately) or switch a lecturer to department admin.

**Restrictions you can check.** Paste a URL from another role's area and you're sent back to
your own. The API also refuses on its own: for example, the Mathematics admin can't open a
Computer Science result sheet (404), and a lecturer can't approve results (403).

## Running locally

Requires Python 3.12+ and Node.js 20+.

### Backend (http://127.0.0.1:8000)

```bash
cd backend
python -m venv .venv
.venv/Scripts/activate          # macOS/Linux: source .venv/bin/activate
pip install -r requirements-dev.txt
python manage.py migrate
python manage.py seed_demo
python manage.py runserver
```

No configuration is needed locally: it uses SQLite and development defaults.
`seed_demo` does nothing if the demo data is already there. To start over, run
`python manage.py flush --no-input` and then `seed_demo` again.

### Frontend (http://localhost:5173)

```bash
cd frontend
npm install
npm run dev
```

Vite forwards `/api` to the backend, so open the app at http://localhost:5173.

### Tests and checks

```bash
cd backend && pytest                       # 166 tests: permissions, workflows, grading
cd backend && ruff check . && ruff format --check .
cd frontend && npm run lint && npm run build
```

## Configuration

The backend reads these environment variables. All of them are optional locally.

| Variable | Default | Purpose |
|---|---|---|
| `DJANGO_DEBUG` | `true` | Set to `false` in production. Turns on secure cookies and requires a secret key. |
| `DJANGO_SECRET_KEY` | dev-only key | Required when debug is off. |
| `DJANGO_ALLOWED_HOSTS` | `localhost,127.0.0.1` | Comma-separated hostnames. |
| `DJANGO_CSRF_TRUSTED_ORIGINS` | `http://localhost:5173` | The frontend's origin, e.g. `https://uemp.vercel.app`. |
| `DATABASE_URL` | SQLite file | Any database URL, e.g. Postgres. |

## Grading

Configured in `backend/config/settings.py` (`GRADING_SCALE`, `CA_MAX_SCORE`, `EXAM_MAX_SCORE`).
CA is out of 30 and the exam out of 70.

| Total | 70–100 | 60–69 | 50–59 | 45–49 | 40–44 | 0–39 |
|---|---|---|---|---|---|---|
| Grade | A | B | C | D | E | F |
| Point | 5 | 4 | 3 | 2 | 1 | 0 |

GPA = Σ(course units × grade point) ÷ Σ(course units), over approved results only.

## Deployment

The browser only ever talks to the Vercel domain. Vercel forwards `/api/*` to Render, so the
session cookie stays first-party (see decision D11 in the architecture doc).

1. **Backend on Render.** Create a *Blueprint* from this repository. `render.yaml` creates the
   API and a free Postgres database, then migrates and seeds on each deploy. Once Vercel
   gives you a URL, set `DJANGO_CSRF_TRUSTED_ORIGINS` to it in the Render dashboard.
2. **Frontend on Vercel.** Import the repository with **Root Directory** set to `frontend`;
   Vite is detected automatically. If Render named the service something other than
   `uemp-api`, update the destination URL in `frontend/vercel.json`.

Render's free tier sleeps after 15 minutes idle, so the first request can take up to a minute.
Open the app once shortly before a demo.

## Project layout

```
backend/
  config/            settings, URLs
  apps/
    core/            permission classes, pagination, error handling, seed_demo command
    accounts/        users, student and staff profiles, sign-in, user management
    academics/       faculties, departments, programs, sessions, semesters, courses, allocation
    registration/    course registration
    results/         result sheets, scores, grading, approval workflow
    audit/           audit log
    reports/         dashboard and course reports
frontend/src/
  auth/              session state and route guard
  layouts/           app shell and per-role navigation
  pages/             one folder per area: student, lecturer, results, manage, admin
  components/        shared building blocks (tables, form dialog, stat cards); ui/ is shadcn
  lib/               API client, query helpers, types
docs/ARCHITECTURE.md
```

## Out of scope

As agreed in the brief: fee payments, accommodation, admissions, attendance, SMS/email,
mobile apps, transcript certification and integration with external systems.
