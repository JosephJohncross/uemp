from django.db import transaction
from rest_framework.exceptions import ValidationError

from apps.accounts.models import StaffProfile, User
from apps.audit.services import record
from apps.core.permissions import ensure_department_access
from apps.results.models import ResultSheet

from .models import Course, CourseAllocation, Semester


def get_current_semester() -> Semester:
    semester = Semester.objects.select_related("session").filter(is_current=True).first()
    if semester is None:
        raise ValidationError({"detail": "No current semester has been set."})
    return semester


@transaction.atomic
def set_current_semester(semester: Semester, *, actor: User) -> Semester:
    Semester.objects.filter(is_current=True).exclude(pk=semester.pk).update(
        is_current=False, registration_open=False
    )
    semester.is_current = True
    semester.save()
    record(actor, "semester.set_current", semester, f"{semester} set as current semester")
    return semester


def set_registration_open(semester: Semester, is_open: bool, *, actor: User) -> Semester:
    if is_open and not semester.is_current:
        raise ValidationError(
            {"detail": "Registration can only be opened for the current semester."}
        )
    semester.registration_open = is_open
    semester.save()
    state = "opened" if is_open else "closed"
    record(
        actor, f"semester.registration_{state}", semester, f"Registration {state} for {semester}"
    )
    return semester


@transaction.atomic
def allocate_course(
    *, actor: User, course: Course, lecturer: StaffProfile, semester: Semester | None = None
) -> CourseAllocation:
    semester = semester or get_current_semester()
    ensure_department_access(actor, course.department_id)
    if lecturer.user.role != User.Role.LECTURER:
        raise ValidationError({"lecturer": ["Only lecturers can be allocated to courses."]})
    if lecturer.department_id != course.department_id:
        raise ValidationError(
            {"lecturer": ["The lecturer must belong to the department that owns the course."]}
        )

    allocation, created = CourseAllocation.objects.update_or_create(
        course=course, semester=semester, defaults={"lecturer": lecturer}
    )
    # Every allocated course has a result sheet from the start, so the lecturer can open it
    # straight away and the department can track its status.
    ResultSheet.objects.get_or_create(course=course, semester=semester)

    verb = "Allocated" if created else "Reallocated"
    record(
        actor,
        "course.allocated",
        allocation,
        f"{verb} {course.code} ({semester}) to {lecturer}",
        lecturer=lecturer.pk,
    )
    return allocation
