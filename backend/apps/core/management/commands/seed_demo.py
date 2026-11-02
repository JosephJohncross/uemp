from datetime import date

from django.core.management.base import BaseCommand
from django.db import transaction

from apps.academics.models import (
    AcademicSession,
    Course,
    Department,
    Faculty,
    Program,
    Semester,
    Term,
)
from apps.academics.services import allocate_course
from apps.accounts.models import StaffProfile, StudentProfile, User
from apps.registration.models import CourseRegistration
from apps.registration.services import register_courses
from apps.results.models import ResultSheet
from apps.results.services import approve_sheet, save_scores, submit_sheet

DEMO_PASSWORD = "Uemp@2026"
SUPER_ADMIN_EMAIL = "superadmin@uemp.test"

# (code, title, units, level, term, owning dept code, program codes offered to)
COURSES = [
    ("CSC101", "Introduction to Computer Science", 3, 100, Term.FIRST, "CSC", ["BSC-CSC"]),
    ("CSC103", "Introduction to Programming", 3, 100, Term.FIRST, "CSC", ["BSC-CSC"]),
    ("CSC102", "Introduction to Problem Solving", 3, 100, Term.SECOND, "CSC", ["BSC-CSC"]),
    ("MTH101", "Elementary Mathematics I", 3, 100, Term.FIRST, "MTH", ["BSC-CSC", "BSC-MTH"]),
    ("MTH103", "Elementary Mathematics II", 3, 100, Term.FIRST, "MTH", ["BSC-MTH"]),
    ("MTH102", "Elementary Mathematics III", 3, 100, Term.SECOND, "MTH", ["BSC-CSC", "BSC-MTH"]),
    ("CSC201", "Computer Programming I", 3, 200, Term.FIRST, "CSC", ["BSC-CSC"]),
    ("CSC203", "Discrete Structures", 3, 200, Term.FIRST, "CSC", ["BSC-CSC"]),
    ("CSC205", "Operating Systems I", 2, 200, Term.FIRST, "CSC", ["BSC-CSC"]),
    ("MTH201", "Linear Algebra I", 3, 200, Term.FIRST, "MTH", ["BSC-CSC", "BSC-MTH"]),
    ("CSC202", "Computer Programming II", 3, 200, Term.SECOND, "CSC", ["BSC-CSC"]),
    ("EEE101", "Basic Electrical Engineering I", 3, 100, Term.FIRST, "EEE", ["BENG-EEE"]),
]

# (email, first, last, title, staff id, dept code, role)
STAFF = [
    ("csc.admin@uemp.test", "Grace", "Eze", "Dr.", "STF/CSC/001", "CSC", User.Role.DEPT_ADMIN),
    ("mth.admin@uemp.test", "Musa", "Ibrahim", "Dr.", "STF/MTH/001", "MTH", User.Role.DEPT_ADMIN),
    ("eee.admin@uemp.test", "Ifeoma", "Nwosu", "Engr.", "STF/EEE/001", "EEE", User.Role.DEPT_ADMIN),
    ("a.okafor@uemp.test", "Adaeze", "Okafor", "Dr.", "STF/CSC/002", "CSC", User.Role.LECTURER),
    (
        "b.adeyemi@uemp.test",
        "Babatunde",
        "Adeyemi",
        "Mr.",
        "STF/CSC/003",
        "CSC",
        User.Role.LECTURER,
    ),
    ("c.bello@uemp.test", "Chinedu", "Bello", "Prof.", "STF/MTH/002", "MTH", User.Role.LECTURER),
    ("d.yusuf@uemp.test", "Danjuma", "Yusuf", "Engr.", "STF/EEE/002", "EEE", User.Role.LECTURER),
]

# (email, first, last, matric number, program code, level)
STUDENTS = [
    ("tobi.ade@uemp.test", "Tobi", "Ade", "CSC/2024/001", "BSC-CSC", 200),
    ("amaka.obi@uemp.test", "Amaka", "Obi", "CSC/2024/002", "BSC-CSC", 200),
    ("sani.lawal@uemp.test", "Sani", "Lawal", "CSC/2024/003", "BSC-CSC", 200),
    ("kemi.alabi@uemp.test", "Kemi", "Alabi", "CSC/2025/001", "BSC-CSC", 100),
    ("emeka.uche@uemp.test", "Emeka", "Uche", "CSC/2025/002", "BSC-CSC", 100),
    ("zainab.musa@uemp.test", "Zainab", "Musa", "MTH/2025/001", "BSC-MTH", 100),
    ("femi.oke@uemp.test", "Femi", "Oke", "EEE/2025/001", "BENG-EEE", 100),
]

PREVIOUS_ALLOCATIONS = {
    "CSC101": "a.okafor@uemp.test",
    "CSC103": "b.adeyemi@uemp.test",
    "CSC102": "b.adeyemi@uemp.test",
    "MTH101": "c.bello@uemp.test",
    "MTH102": "c.bello@uemp.test",
}

CURRENT_ALLOCATIONS = {
    "CSC101": "a.okafor@uemp.test",
    "CSC103": "b.adeyemi@uemp.test",
    "CSC201": "a.okafor@uemp.test",
    "CSC203": "b.adeyemi@uemp.test",
    "CSC205": "b.adeyemi@uemp.test",
    "MTH101": "c.bello@uemp.test",
    "MTH103": "c.bello@uemp.test",
    "MTH201": "c.bello@uemp.test",
    "EEE101": "d.yusuf@uemp.test",
}

# Last session's scores for the 200 level students: matric -> course -> (ca, exam)
HISTORICAL_SCORES = {
    "CSC/2024/001": {"CSC101": (25, 58), "CSC103": (22, 49), "MTH101": (18, 40),
                     "CSC102": (27, 50), "MTH102": (20, 35)},
    "CSC/2024/002": {"CSC101": (28, 62), "CSC103": (26, 60), "MTH101": (24, 51),
                     "CSC102": (29, 58), "MTH102": (25, 47)},
    "CSC/2024/003": {"CSC101": (15, 30), "CSC103": (18, 33), "MTH101": (12, 25),
                     "CSC102": (20, 38), "MTH102": (14, 28)},
}  # fmt: skip

CURRENT_200_LEVEL_COURSES = ["CSC201", "CSC203", "CSC205", "MTH201"]

# Current-semester sheets left in different workflow states so every review path can be demoed.
CURRENT_SHEETS = [
    ("CSC201", ResultSheet.Status.SUBMITTED,
     {"CSC/2024/001": (24, 51), "CSC/2024/002": (27, 60), "CSC/2024/003": (17, 36)}),
    ("CSC203", ResultSheet.Status.DRAFT,
     {"CSC/2024/001": (22, None), "CSC/2024/002": (25, None)}),
]  # fmt: skip


class Command(BaseCommand):
    help = "Load demo faculties, users, courses, registrations and results."

    def handle(self, *args, **options):
        if User.objects.filter(email=SUPER_ADMIN_EMAIL).exists():
            self.stdout.write("Demo data already present; nothing to do.")
            return

        with transaction.atomic():
            self.super_admin = User.objects.create_superuser(
                email=SUPER_ADMIN_EMAIL,
                password=DEMO_PASSWORD,
                first_name="Ngozi",
                last_name="Adebayo",
            )
            self._create_structure()
            self._create_sessions()
            self._create_courses()
            self._create_staff()
            self._create_students()
            self._create_history()
            self._create_current_semester_activity()

        self.stdout.write(
            self.style.SUCCESS(f"Demo data loaded. Password for all users: {DEMO_PASSWORD}")
        )

    def _create_structure(self):
        science = Faculty.objects.create(name="Faculty of Science", code="SCI")
        engineering = Faculty.objects.create(name="Faculty of Engineering", code="ENG")

        csc = Department.objects.create(faculty=science, name="Computer Science", code="CSC")
        mth = Department.objects.create(faculty=science, name="Mathematics", code="MTH")
        eee = Department.objects.create(
            faculty=engineering, name="Electrical and Electronics Engineering", code="EEE"
        )
        self.departments = {d.code: d for d in (csc, mth, eee)}

        programs = [
            Program.objects.create(department=csc, name="B.Sc. Computer Science", code="BSC-CSC"),
            Program.objects.create(department=mth, name="B.Sc. Mathematics", code="BSC-MTH"),
            Program.objects.create(
                department=eee,
                name="B.Eng. Electrical and Electronics Engineering",
                code="BENG-EEE",
                duration_years=5,
            ),
        ]
        self.programs = {p.code: p for p in programs}

    def _create_sessions(self):
        previous = AcademicSession.objects.create(
            name="2024/2025", start_date=date(2024, 10, 1), end_date=date(2025, 9, 30)
        )
        current = AcademicSession.objects.create(
            name="2025/2026", start_date=date(2025, 10, 1), end_date=date(2026, 9, 30)
        )
        self.previous_first = Semester.objects.create(session=previous, term=Term.FIRST)
        self.previous_second = Semester.objects.create(session=previous, term=Term.SECOND)
        self.current = Semester.objects.create(
            session=current, term=Term.FIRST, is_current=True, registration_open=True
        )
        Semester.objects.create(session=current, term=Term.SECOND)

    def _create_courses(self):
        self.courses = {}
        for code, title, units, level, term, dept_code, program_codes in COURSES:
            course = Course.objects.create(
                department=self.departments[dept_code],
                code=code,
                title=title,
                units=units,
                level=level,
                term=term,
            )
            course.programs.set(self.programs[c] for c in program_codes)
            self.courses[code] = course

    def _create_staff(self):
        self.staff = {}
        for email, first, last, title, staff_id, dept_code, role in STAFF:
            user = User.objects.create_user(
                email=email, password=DEMO_PASSWORD, first_name=first, last_name=last, role=role
            )
            self.staff[email] = StaffProfile.objects.create(
                user=user, staff_id=staff_id, department=self.departments[dept_code], title=title
            )

    def _create_students(self):
        self.students = {}
        for email, first, last, matric, program_code, level in STUDENTS:
            user = User.objects.create_user(
                email=email,
                password=DEMO_PASSWORD,
                first_name=first,
                last_name=last,
                role=User.Role.STUDENT,
            )
            self.students[matric] = StudentProfile.objects.create(
                user=user, matric_number=matric, program=self.programs[program_code], level=level
            )

    def _create_history(self):
        semester_for_term = {Term.FIRST: self.previous_first, Term.SECOND: self.previous_second}
        for course_code, lecturer_email in PREVIOUS_ALLOCATIONS.items():
            course = self.courses[course_code]
            semester = semester_for_term[course.term]
            self._allocate(course, semester, lecturer_email)

            # These students were 100 level last session, so their past registrations are
            # created directly; the registration service only handles the current semester.
            scores = {}
            for matric, course_scores in HISTORICAL_SCORES.items():
                if course_code in course_scores:
                    registration = CourseRegistration.objects.create(
                        student=self.students[matric], course=course, semester=semester
                    )
                    scores[registration] = course_scores[course_code]

            sheet = self._enter_scores(course, semester, lecturer_email, scores)
            submit_sheet(sheet=sheet, actor=self.staff[lecturer_email].user)
            approve_sheet(sheet=sheet, actor=self._department_admin(course))

    def _create_current_semester_activity(self):
        for course_code, lecturer_email in CURRENT_ALLOCATIONS.items():
            self._allocate(self.courses[course_code], self.current, lecturer_email)

        # 200 level students are registered; 100 level students are left unregistered
        # so course registration can be demoed live.
        for matric in HISTORICAL_SCORES:
            register_courses(
                student=self.students[matric],
                course_ids=[self.courses[code].pk for code in CURRENT_200_LEVEL_COURSES],
            )

        for course_code, status, student_scores in CURRENT_SHEETS:
            course = self.courses[course_code]
            lecturer_email = CURRENT_ALLOCATIONS[course_code]
            scores = {
                CourseRegistration.objects.get(
                    student=self.students[matric], course=course, semester=self.current
                ): course_score
                for matric, course_score in student_scores.items()
            }
            sheet = self._enter_scores(course, self.current, lecturer_email, scores)
            if status == ResultSheet.Status.SUBMITTED:
                submit_sheet(sheet=sheet, actor=self.staff[lecturer_email].user)

    def _allocate(self, course, semester, lecturer_email):
        allocate_course(
            actor=self.super_admin,
            course=course,
            semester=semester,
            lecturer=self.staff[lecturer_email],
        )

    def _enter_scores(self, course, semester, lecturer_email, scores):
        sheet = ResultSheet.objects.get(course=course, semester=semester)
        entries = [
            {"registration": registration.pk, "ca_score": ca, "exam_score": exam}
            for registration, (ca, exam) in scores.items()
        ]
        return save_scores(sheet=sheet, actor=self.staff[lecturer_email].user, entries=entries)

    def _department_admin(self, course):
        return User.objects.get(
            role=User.Role.DEPT_ADMIN, staff_profile__department=course.department
        )
