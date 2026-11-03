import pytest
from rest_framework.test import APIClient

from apps.audit.models import AuditLog
from conftest import PASSWORD

pytestmark = pytest.mark.django_db


def csrf_client():
    client = APIClient(enforce_csrf_checks=True)
    client.get("/api/auth/csrf/")
    client.credentials(HTTP_X_CSRFTOKEN=client.cookies["csrftoken"].value)
    return client


def login(client, email, password=PASSWORD):
    return client.post("/api/auth/login/", {"email": email, "password": password}, format="json")


def test_login_returns_profile_and_starts_session(world):
    client = csrf_client()

    response = login(client, "ada@test.edu")

    assert response.status_code == 200
    assert response.data["role"] == "STUDENT"
    assert response.data["student_profile"]["matric_number"] == "CSC/25/001"
    assert client.get("/api/auth/me/").status_code == 200
    assert AuditLog.objects.filter(action="auth.login", actor=world.student.user).exists()


def test_login_email_is_case_insensitive(world):
    assert login(csrf_client(), "  ADA@test.edu ").status_code == 200


def test_login_requires_csrf_token(world):
    client = APIClient(enforce_csrf_checks=True)

    assert login(client, "ada@test.edu").status_code == 403


def test_wrong_password_gets_generic_message(world):
    response = login(csrf_client(), "ada@test.edu", "wrong")

    assert response.status_code == 403
    assert response.data["detail"] == "Invalid email or password."


def test_unknown_email_gets_same_message_as_wrong_password(world):
    response = login(csrf_client(), "nobody@test.edu")

    assert response.data["detail"] == "Invalid email or password."


def test_suspended_user_cannot_log_in(world):
    world.student.user.status = "SUSPENDED"
    world.student.user.save()

    response = login(csrf_client(), "ada@test.edu")

    assert response.status_code == 403
    assert "suspended" in response.data["detail"]


def test_suspension_ends_an_existing_session(world, api):
    client = api(world.student.user)
    assert client.get("/api/auth/me/").status_code == 200

    world.student.user.status = "SUSPENDED"
    world.student.user.save()

    assert client.get("/api/auth/me/").status_code == 403


def test_logout_ends_session(world):
    client = csrf_client()
    login(client, "ada@test.edu")
    client.credentials(HTTP_X_CSRFTOKEN=client.cookies["csrftoken"].value)

    assert client.post("/api/auth/logout/").status_code == 204
    assert client.get("/api/auth/me/").status_code == 403


def test_student_can_update_only_contact_details(world, api):
    client = api(world.student.user)

    response = client.patch(
        "/api/auth/me/",
        {"phone": "08030000000", "address": "Hall 3", "matric_number": "HACKED", "level": 500},
        format="json",
    )

    assert response.status_code == 200
    world.student.refresh_from_db()
    assert world.student.phone == "08030000000"
    assert world.student.address == "Hall 3"
    assert world.student.matric_number == "CSC/25/001"
    assert world.student.level == 100


def change_password(client, current, new):
    return client.post(
        "/api/auth/password/",
        {"current_password": current, "new_password": new},
        format="json",
    )


def test_password_change_keeps_session_and_replaces_old_password(world, api):
    client = api(world.student.user)

    response = change_password(client, PASSWORD, "A-much-better-one-2026")

    assert response.status_code == 204
    assert client.get("/api/auth/me/").status_code == 200
    world.student.user.refresh_from_db()
    assert world.student.user.check_password("A-much-better-one-2026")
    assert not world.student.user.check_password(PASSWORD)
    assert AuditLog.objects.filter(action="auth.password_changed").exists()


@pytest.mark.parametrize(
    ("current", "new", "field"),
    [
        ("wrong-password", "A-much-better-one-2026", "current_password"),
        (PASSWORD, "123", "new_password"),
    ],
)
def test_password_change_validation(world, api, current, new, field):
    response = change_password(api(world.student.user), current, new)

    assert response.status_code == 400
    assert field in response.data
