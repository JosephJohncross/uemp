"""Every role against every list endpoint: the role layer of the permission model."""

import pytest

pytestmark = pytest.mark.django_db

ROLES = ["anonymous", "student", "lecturer", "dept_admin", "super_admin"]

# endpoint -> roles that may GET it; everyone else must be refused.
ACCESS = {
    "/api/auth/me/": {"student", "lecturer", "dept_admin", "super_admin"},
    "/api/student/registration/": {"student"},
    "/api/student/registration/available/": {"student"},
    "/api/student/results/": {"student"},
    "/api/faculties/": {"student", "lecturer", "dept_admin", "super_admin"},
    "/api/semesters/current/": {"student", "lecturer", "dept_admin", "super_admin"},
    "/api/courses/": {"lecturer", "dept_admin", "super_admin"},
    "/api/allocations/": {"lecturer", "dept_admin", "super_admin"},
    "/api/result-sheets/": {"lecturer", "dept_admin", "super_admin"},
    "/api/students/": {"dept_admin", "super_admin"},
    "/api/staff/": {"dept_admin", "super_admin"},
    "/api/registrations/": {"dept_admin", "super_admin"},
    "/api/reports/overview/": {"dept_admin", "super_admin"},
    "/api/reports/courses/": {"dept_admin", "super_admin"},
    "/api/users/": {"super_admin"},
    "/api/audit-logs/": {"super_admin"},
}


def user_for(world, role):
    return {
        "anonymous": None,
        "student": world.student.user,
        "lecturer": world.csc_lecturer,
        "dept_admin": world.csc_admin,
        "super_admin": world.super_admin,
    }[role]


@pytest.mark.parametrize("role", ROLES)
@pytest.mark.parametrize("endpoint", ACCESS)
def test_role_access(world, api, endpoint, role):
    response = api(user_for(world, role)).get(endpoint)

    if role in ACCESS[endpoint]:
        assert response.status_code == 200
    else:
        assert response.status_code == 403


@pytest.mark.parametrize(
    ("role", "method", "endpoint", "payload"),
    [
        ("student", "post", "/api/faculties/", {"name": "Law", "code": "LAW"}),
        ("lecturer", "post", "/api/faculties/", {"name": "Law", "code": "LAW"}),
        ("dept_admin", "post", "/api/faculties/", {"name": "Law", "code": "LAW"}),
        ("dept_admin", "post", "/api/sessions/", {"name": "2030/2031"}),
        ("lecturer", "post", "/api/courses/", {"code": "CSC999"}),
        ("student", "post", "/api/allocations/", {}),
        ("lecturer", "post", "/api/allocations/", {}),
    ],
)
def test_writes_refused_for_roles_without_authority(world, api, role, method, endpoint, payload):
    response = getattr(api(user_for(world, role)), method)(endpoint, payload, format="json")

    assert response.status_code == 403
