from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from rest_framework.exceptions import AuthenticationFailed, PermissionDenied, ValidationError

from apps.academics.models import Department, Program
from apps.audit.services import record
from apps.core.permissions import ensure_department_access

from .models import StaffProfile, StudentProfile, User

STAFF_ROLES = (User.Role.LECTURER, User.Role.DEPT_ADMIN)


def authenticate_user(request, email: str, password: str) -> User:
    email = email.strip().lower()
    user = authenticate(request, email=email, password=password)
    if user:
        return user
    # Django's backend rejects inactive accounts without saying why. Once the password is
    # proven correct, it's safe to tell the person their account isn't active.
    inactive = User.objects.filter(email=email, is_active=False).first()
    if inactive and inactive.check_password(password):
        raise AuthenticationFailed(
            f"This account is {inactive.get_status_display().lower()}. "
            "Contact the system administrator."
        )
    raise AuthenticationFailed("Invalid email or password.")


def _ensure_email_available(email: str, exclude_user: User | None = None) -> None:
    users = User.objects.filter(email=email)
    if exclude_user:
        users = users.exclude(pk=exclude_user.pk)
    if users.exists():
        raise ValidationError({"email": ["A user with this email already exists."]})


def _create_user(*, email: str, password: str, role: str, **names) -> User:
    email = email.strip().lower()
    _ensure_email_available(email)
    user = User(email=email, role=role, **names)
    try:
        validate_password(password, user)
    except DjangoValidationError as exc:
        raise ValidationError({"password": list(exc.messages)}) from exc
    user.set_password(password)
    user.save()
    return user


def _update_user(user: User, fields: dict) -> None:
    if "email" in fields:
        fields["email"] = fields["email"].strip().lower()
        _ensure_email_available(fields["email"], exclude_user=user)
    for name, value in fields.items():
        setattr(user, name, value)
    user.save()


def _validate_level(program: Program, level: int) -> None:
    if level > program.max_level:
        raise ValidationError(
            {"level": [f"{program.name} only runs up to {program.max_level} level."]}
        )


@transaction.atomic
def create_student(*, actor: User, user: dict, password: str, **profile) -> StudentProfile:
    program = profile["program"]
    ensure_department_access(actor, program.department_id)
    _validate_level(program, profile["level"])

    student_user = _create_user(password=password, role=User.Role.STUDENT, **user)
    student = StudentProfile.objects.create(user=student_user, **profile)
    record(actor, "student.created", student, f"Created student {student.matric_number}")
    return student


@transaction.atomic
def update_student(
    student: StudentProfile, *, actor: User, user: dict | None = None, **profile
) -> StudentProfile:
    ensure_department_access(actor, student.program.department_id)
    program = profile.get("program", student.program)
    ensure_department_access(actor, program.department_id)
    _validate_level(program, profile.get("level", student.level))

    if user:
        _update_user(student.user, user)
    for name, value in profile.items():
        setattr(student, name, value)
    student.save()
    record(actor, "student.updated", student, f"Updated student {student.matric_number}")
    return student


def _check_staff_role_assignment(actor: User, role: str, department: Department) -> None:
    ensure_department_access(actor, department.pk)
    if role not in STAFF_ROLES:
        raise ValidationError({"role": ["Staff must be a lecturer or a department admin."]})
    if actor.role == User.Role.DEPT_ADMIN and role != User.Role.LECTURER:
        raise PermissionDenied("Department admins can only manage lecturer accounts.")


@transaction.atomic
def create_staff(*, actor: User, user: dict, password: str, **profile) -> StaffProfile:
    _check_staff_role_assignment(actor, user["role"], profile["department"])

    staff_user = _create_user(password=password, **user)
    staff = StaffProfile.objects.create(user=staff_user, **profile)
    record(actor, "staff.created", staff, f"Created {staff_user.get_role_display()} {staff}")
    return staff


@transaction.atomic
def update_staff(
    staff: StaffProfile, *, actor: User, user: dict | None = None, **profile
) -> StaffProfile:
    user = user or {}
    # Role changes go through set_user_role so they are audited as such.
    user.pop("role", None)
    _check_staff_role_assignment(actor, staff.user.role, staff.department)
    _check_staff_role_assignment(
        actor, staff.user.role, profile.get("department", staff.department)
    )

    if user:
        _update_user(staff.user, user)
    for name, value in profile.items():
        setattr(staff, name, value)
    staff.save()
    record(actor, "staff.updated", staff, f"Updated staff {staff.staff_id}")
    return staff


def set_user_status(*, actor: User, user: User, status: str) -> User:
    if user == actor:
        raise ValidationError({"status": ["You can't change the status of your own account."]})
    previous = user.status
    user.status = status
    user.save()
    record(
        actor,
        "user.status_changed",
        user,
        f"{user.email}: {previous} -> {status}",
        previous=previous,
        new=status,
    )
    return user


def set_user_role(*, actor: User, user: User, role: str) -> User:
    if user == actor:
        raise ValidationError({"role": ["You can't change your own role."]})
    # Students and staff carry different profiles, so only moves between the two staff roles
    # are allowed; anything else means creating a new account.
    if user.role not in STAFF_ROLES or role not in STAFF_ROLES:
        raise ValidationError(
            {"role": ["Only lecturer and department admin roles can be swapped."]}
        )
    previous = user.role
    user.role = role
    user.save()
    record(
        actor,
        "user.role_changed",
        user,
        f"{user.email}: {previous} -> {role}",
        previous=previous,
        new=role,
    )
    return user


def update_own_profile(user: User, *, phone: str | None = None, address: str | None = None):
    profile = getattr(user, "student_profile", None) or getattr(user, "staff_profile", None)
    if profile is None:
        return user
    if phone is not None:
        profile.phone = phone
    if address is not None and isinstance(profile, StudentProfile):
        profile.address = address
    profile.save()
    return user


def change_password(user: User, *, current_password: str, new_password: str) -> User:
    if not user.check_password(current_password):
        raise ValidationError({"current_password": ["Your current password is incorrect."]})
    try:
        validate_password(new_password, user)
    except DjangoValidationError as exc:
        raise ValidationError({"new_password": list(exc.messages)}) from exc
    user.set_password(new_password)
    user.save()
    record(user, "auth.password_changed", user, f"{user.email} changed their password")
    return user
