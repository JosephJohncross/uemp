from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import SAFE_METHODS, BasePermission

from apps.accounts.models import User

Role = User.Role


class RolePermission(BasePermission):
    roles: tuple[str, ...] = ()

    def has_permission(self, request, view):
        return bool(request.user.is_authenticated and request.user.role in self.roles)


class IsStudent(RolePermission):
    roles = (Role.STUDENT,)


class IsLecturer(RolePermission):
    roles = (Role.LECTURER,)


class IsDeptAdmin(RolePermission):
    roles = (Role.DEPT_ADMIN,)


class IsSuperAdmin(RolePermission):
    roles = (Role.SUPER_ADMIN,)


class IsAdmin(RolePermission):
    roles = (Role.DEPT_ADMIN, Role.SUPER_ADMIN)


class IsStaff(RolePermission):
    roles = (Role.LECTURER, Role.DEPT_ADMIN, Role.SUPER_ADMIN)


class IsReadOnly(BasePermission):
    """Any signed-in user may read; combine with a role class to gate writes."""

    def has_permission(self, request, view):
        return bool(request.user.is_authenticated and request.method in SAFE_METHODS)


def staff_department_id(user) -> int | None:
    profile = getattr(user, "staff_profile", None)
    return profile.department_id if profile else None


def ensure_department_access(user, department_id: int) -> None:
    if user.role == Role.SUPER_ADMIN:
        return
    if user.role == Role.DEPT_ADMIN and staff_department_id(user) == department_id:
        return
    raise PermissionDenied("You can only manage records in your own department.")
