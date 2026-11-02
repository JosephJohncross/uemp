from datetime import date
from types import SimpleNamespace

import pytest
from django.core.cache import cache
from rest_framework.test import APIClient

from apps.academics.models import AcademicSession, Course, Department, Faculty, Program, Semester
from apps.academics.services import allocate_course
from apps.accounts.models import StaffProfile, StudentProfile, User
from apps.registration.services import register_courses
from apps.results.models import ResultSheet

PASSWORD = "Test#Pass2026"


@pytest.fixture(autouse=True)
def fast_tests(settings):
    settings.PASSWORD_HASHERS = ["django.contrib.auth.hashers.MD5PasswordHasher"]
    cache.clear()


def make_user(email, role, **extra):
    return User.objects.create_user(
        email=email,
        password=PASSWORD,
        first_name="Test",
        last_name=email.split("@")[0],
        role=role,
        **extra,
    )


def make_staff(email, role, department, staff_id):
    user = make_user(email, role)
    return StaffProfile.objects.create(user=user, staff_id=staff_id, department=department)


def make_student(email, program, level, matric):
    user = make_user(email, User.Role.STUDENT)
    return StudentProfile.objects.create(
        user=user, matric_number=matric, program=program, level=level
    )


@pytest.fixture
def world(db):
    """Two departments with an admin and lecturer each, students, courses and an open semester."""
    faculty = Faculty.objects.create(name="Faculty of Science", code="SCI")
    csc = Department.objects.create(faculty=faculty, name="Computer Science", code="CSC")
    mth = Department.objects.create(faculty=faculty, name="Mathematics", code="MTH")
    csc_program = Program.objects.create(department=csc, name="B.Sc. CS", code="BSC-CSC")
    mth_program = Program.objects.create(department=mth, name="B.Sc. Maths", code="BSC-MTH")

    session = AcademicSession.objects.create(
        name="2025/2026", start_date=date(2025, 10, 1), end_date=date(2026, 9, 30)
    )
    semester = Semester.objects.create(
        session=session, term="FIRST", is_current=True, registration_open=True
    )
    second_semester = Semester.objects.create(session=session, term="SECOND")

    def course(code, department, programs, units=3, level=100, term="FIRST"):
        created = Course.objects.create(
            department=department, code=code, title=code, units=units, level=level, term=term
        )
        created.programs.set(programs)
        return created

    courses = SimpleNamespace(
        csc101=course("CSC101", csc, [csc_program]),
        csc103=course("CSC103", csc, [csc_program], units=4),
        csc102=course("CSC102", csc, [csc_program], term="SECOND"),
        csc201=course("CSC201", csc, [csc_program], level=200),
        mth101=course("MTH101", mth, [csc_program, mth_program]),
        mth103=course("MTH103", mth, [mth_program]),
    )

    super_admin = make_user("super@test.edu", User.Role.SUPER_ADMIN)
    csc_admin = make_staff("csc.admin@test.edu", User.Role.DEPT_ADMIN, csc, "S-CSC-1")
    mth_admin = make_staff("mth.admin@test.edu", User.Role.DEPT_ADMIN, mth, "S-MTH-1")
    csc_lecturer = make_staff("csc.lecturer@test.edu", User.Role.LECTURER, csc, "S-CSC-2")
    other_csc_lecturer = make_staff("csc.other@test.edu", User.Role.LECTURER, csc, "S-CSC-3")
    mth_lecturer = make_staff("mth.lecturer@test.edu", User.Role.LECTURER, mth, "S-MTH-2")

    student = make_student("ada@test.edu", csc_program, 100, "CSC/25/001")
    classmate = make_student("bayo@test.edu", csc_program, 100, "CSC/25/002")
    mth_student = make_student("chi@test.edu", mth_program, 100, "MTH/25/001")

    allocate_course(actor=super_admin, course=courses.csc101, lecturer=csc_lecturer)
    allocate_course(actor=super_admin, course=courses.mth101, lecturer=mth_lecturer)

    return SimpleNamespace(
        csc=csc,
        mth=mth,
        csc_program=csc_program,
        mth_program=mth_program,
        semester=semester,
        second_semester=second_semester,
        courses=courses,
        super_admin=super_admin,
        csc_admin=csc_admin.user,
        mth_admin=mth_admin.user,
        csc_lecturer=csc_lecturer.user,
        other_csc_lecturer=other_csc_lecturer.user,
        mth_lecturer=mth_lecturer.user,
        student=student,
        classmate=classmate,
        mth_student=mth_student,
    )


@pytest.fixture
def api():
    """Returns an APIClient signed in as the given user (or anonymous for None)."""

    def client_for(user=None):
        client = APIClient()
        if user is not None:
            client.force_login(user)
        return client

    return client_for


@pytest.fixture
def csc101_sheet(world):
    """CSC101 with two registered students; the sheet starts as an empty draft."""
    for student in (world.student, world.classmate):
        register_courses(student=student, course_ids=[world.courses.csc101.pk])
    return ResultSheet.objects.get(course=world.courses.csc101, semester=world.semester)
