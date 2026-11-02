import pytest

from apps.academics.models import Course
from apps.audit.models import AuditLog
from apps.registration.models import CourseRegistration

pytestmark = pytest.mark.django_db

ENDPOINT = "/api/student/registration/"


def register(client, *courses):
    return client.post(ENDPOINT, {"course_ids": [c.pk for c in courses]}, format="json")


def test_available_courses_match_program_level_and_term(world, api):
    response = api(world.student.user).get(f"{ENDPOINT}available/")

    codes = [course["code"] for course in response.data["courses"]]
    # CSC103 and MTH101 are offered to the student's program; CSC102 is second term,
    # CSC201 is 200 level and MTH103 is only offered to mathematics students.
    assert codes == ["CSC101", "CSC103", "MTH101"]


def test_student_registers_courses_and_sees_them(world, api):
    client = api(world.student.user)

    response = register(client, world.courses.csc101, world.courses.mth101)

    assert response.status_code == 201
    mine = client.get(ENDPOINT).data
    assert [r["course"]["code"] for r in mine["registrations"]] == ["CSC101", "MTH101"]
    assert mine["total_units"] == 6
    assert AuditLog.objects.filter(action="registration.created").count() == 1


@pytest.mark.parametrize("course_name", ["csc102", "csc201", "mth103"])
def test_courses_outside_program_level_or_term_are_refused(world, api, course_name):
    course = getattr(world.courses, course_name)

    response = register(api(world.student.user), course)

    assert response.status_code == 400
    assert course.code in response.data["course_ids"][0]
    assert not CourseRegistration.objects.exists()


def test_inactive_course_is_not_available(world, api):
    Course.objects.filter(pk=world.courses.csc101.pk).update(is_active=False)

    assert register(api(world.student.user), world.courses.csc101).status_code == 400


def test_duplicate_registration_is_refused(world, api):
    client = api(world.student.user)
    register(client, world.courses.csc101)

    response = register(client, world.courses.csc101, world.courses.csc103)

    assert response.status_code == 400
    assert "Already registered" in response.data["course_ids"][0]
    assert CourseRegistration.objects.filter(student=world.student).count() == 1


def test_registration_refused_when_closed(world, api):
    world.semester.registration_open = False
    world.semester.save()

    response = register(api(world.student.user), world.courses.csc101)

    assert response.status_code == 400
    assert "closed" in response.data["detail"]


def test_unit_limit_is_enforced(world, api, settings):
    settings.MAX_UNITS_PER_SEMESTER = 6

    response = register(api(world.student.user), world.courses.csc101, world.courses.csc103)

    assert response.status_code == 400
    assert "7 units" in response.data["course_ids"][0]


def test_registration_is_all_or_nothing(world, api):
    response = register(api(world.student.user), world.courses.csc101, world.courses.csc201)

    assert response.status_code == 400
    assert not CourseRegistration.objects.exists()


def test_student_cannot_register_someone_else(world, api):
    client = api(world.student.user)

    client.post(
        ENDPOINT,
        {"course_ids": [world.courses.csc101.pk], "student": world.classmate.pk},
        format="json",
    )

    assert not CourseRegistration.objects.filter(student=world.classmate).exists()
    assert CourseRegistration.objects.filter(student=world.student).exists()


def test_dept_admin_sees_registrations_for_own_students_and_courses(world, api):
    register(api(world.student.user), world.courses.csc101, world.courses.mth101)
    register(api(world.mth_student.user), world.courses.mth101)

    csc_rows = api(world.csc_admin).get("/api/registrations/").data["results"]
    mth_rows = api(world.mth_admin).get("/api/registrations/").data["results"]

    assert {(r["matric_number"], r["course"]["code"]) for r in csc_rows} == {
        ("CSC/25/001", "CSC101"),
        ("CSC/25/001", "MTH101"),
    }
    # The maths department sees its own student and the CS student taking its course.
    assert {(r["matric_number"], r["course"]["code"]) for r in mth_rows} == {
        ("CSC/25/001", "MTH101"),
        ("MTH/25/001", "MTH101"),
    }
