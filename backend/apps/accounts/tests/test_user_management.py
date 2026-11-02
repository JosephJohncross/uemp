import pytest

from apps.accounts.models import StudentProfile, User
from apps.audit.models import AuditLog

pytestmark = pytest.mark.django_db


def new_student(program, matric="CSC/25/099", **overrides):
    return {
        "email": "new.student@test.edu",
        "first_name": "New",
        "last_name": "Student",
        "password": "Strong#Pass99",
        "matric_number": matric,
        "program": program.pk,
        "level": 100,
        **overrides,
    }


def new_staff(department, role="LECTURER", **overrides):
    return {
        "email": "new.staff@test.edu",
        "first_name": "New",
        "last_name": "Staff",
        "password": "Strong#Pass99",
        "staff_id": "S-NEW-1",
        "department": department.pk,
        "role": role,
        **overrides,
    }


def test_dept_admin_lists_only_own_department_students(world, api):
    response = api(world.csc_admin).get("/api/students/")

    matrics = {row["matric_number"] for row in response.data["results"]}
    assert matrics == {"CSC/25/001", "CSC/25/002"}


def test_dept_admin_gets_404_for_another_departments_student(world, api):
    response = api(world.csc_admin).get(f"/api/students/{world.mth_student.pk}/")

    assert response.status_code == 404


def test_dept_admin_creates_student_in_own_department(world, api):
    response = api(world.csc_admin).post(
        "/api/students/", new_student(world.csc_program), format="json"
    )

    assert response.status_code == 201
    student = StudentProfile.objects.get(matric_number="CSC/25/099")
    assert student.user.role == User.Role.STUDENT
    assert student.user.check_password("Strong#Pass99")
    assert AuditLog.objects.filter(action="student.created", actor=world.csc_admin).exists()


def test_dept_admin_cannot_create_student_in_another_department(world, api):
    response = api(world.csc_admin).post(
        "/api/students/", new_student(world.mth_program, "MTH/25/099"), format="json"
    )

    assert response.status_code == 403
    assert not StudentProfile.objects.filter(matric_number="MTH/25/099").exists()


def test_dept_admin_cannot_move_student_into_another_department(world, api):
    response = api(world.csc_admin).patch(
        f"/api/students/{world.student.pk}/", {"program": world.mth_program.pk}, format="json"
    )

    assert response.status_code == 403
    world.student.refresh_from_db()
    assert world.student.program == world.csc_program


@pytest.mark.parametrize(
    ("overrides", "field"),
    [
        ({"matric_number": "CSC/25/001"}, "matric_number"),
        ({"email": "ada@test.edu"}, "email"),
        ({"level": 500}, "level"),
        ({"password": "123"}, "password"),
    ],
)
def test_student_creation_validation(world, api, overrides, field):
    payload = new_student(world.csc_program, **overrides)

    response = api(world.super_admin).post("/api/students/", payload, format="json")

    assert response.status_code == 400
    assert field in response.data


def test_dept_admin_can_create_lecturer_but_not_another_admin(world, api):
    client = api(world.csc_admin)

    assert client.post("/api/staff/", new_staff(world.csc), format="json").status_code == 201
    response = client.post(
        "/api/staff/",
        new_staff(world.csc, role="DEPT_ADMIN", email="x@test.edu", staff_id="S-NEW-2"),
        format="json",
    )
    assert response.status_code == 403


def test_super_admin_suspends_user_and_it_is_audited(world, api):
    user = world.student.user

    response = api(world.super_admin).post(
        f"/api/users/{user.pk}/status/", {"status": "SUSPENDED"}, format="json"
    )

    assert response.status_code == 200
    user.refresh_from_db()
    assert user.status == "SUSPENDED"
    assert not user.is_active
    entry = AuditLog.objects.get(action="user.status_changed")
    assert entry.details == {"previous": "ACTIVE", "new": "SUSPENDED"}


def test_super_admin_cannot_change_own_status(world, api):
    response = api(world.super_admin).post(
        f"/api/users/{world.super_admin.pk}/status/", {"status": "SUSPENDED"}, format="json"
    )

    assert response.status_code == 400


def test_role_swap_allowed_only_between_staff_roles(world, api):
    client = api(world.super_admin)

    promoted = client.post(
        f"/api/users/{world.csc_lecturer.pk}/role/", {"role": "DEPT_ADMIN"}, format="json"
    )
    student_swap = client.post(
        f"/api/users/{world.student.user.pk}/role/", {"role": "LECTURER"}, format="json"
    )

    assert promoted.status_code == 200
    assert promoted.data["role"] == "DEPT_ADMIN"
    assert student_swap.status_code == 400
