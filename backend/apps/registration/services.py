from django.conf import settings
from django.db import IntegrityError, transaction
from django.db.models import QuerySet, Sum
from rest_framework.exceptions import ValidationError

from apps.academics.models import Course, Semester
from apps.academics.services import get_current_semester
from apps.accounts.models import StudentProfile
from apps.audit.services import record

from .models import CourseRegistration


def available_courses(student: StudentProfile, semester: Semester) -> QuerySet[Course]:
    return (
        Course.objects.filter(
            programs=student.program,
            level=student.level,
            term=semester.term,
            is_active=True,
        )
        .select_related("department")
        .distinct()
    )


def registered_units(student: StudentProfile, semester: Semester) -> int:
    total = CourseRegistration.objects.filter(student=student, semester=semester).aggregate(
        units=Sum("course__units")
    )["units"]
    return total or 0


def _course_codes(course_ids) -> str:
    codes = Course.objects.filter(pk__in=course_ids).values_list("code", flat=True)
    return ", ".join(sorted(codes)) or "unknown course"


@transaction.atomic
def register_courses(*, student: StudentProfile, course_ids: list[int]) -> list[CourseRegistration]:
    semester = get_current_semester()
    if not semester.registration_open:
        raise ValidationError({"detail": f"Course registration for {semester} is closed."})

    requested = set(course_ids)
    eligible = {c.pk: c for c in available_courses(student, semester).filter(pk__in=requested)}
    not_available = requested - eligible.keys()
    if not_available:
        raise ValidationError(
            {
                "course_ids": [
                    "Not offered to your program, level and semester: "
                    f"{_course_codes(not_available)}."
                ]
            }
        )

    already = CourseRegistration.objects.filter(
        student=student, semester=semester, course__in=requested
    ).values_list("course_id", flat=True)
    if already:
        raise ValidationError(
            {"course_ids": [f"Already registered this semester: {_course_codes(already)}."]}
        )

    new_units = sum(course.units for course in eligible.values())
    total_units = registered_units(student, semester) + new_units
    if total_units > settings.MAX_UNITS_PER_SEMESTER:
        raise ValidationError(
            {
                "course_ids": [
                    f"This would bring you to {total_units} units; "
                    f"the limit is {settings.MAX_UNITS_PER_SEMESTER} per semester."
                ]
            }
        )

    try:
        registrations = CourseRegistration.objects.bulk_create(
            CourseRegistration(student=student, course=course, semester=semester)
            for course in eligible.values()
        )
    except IntegrityError as exc:
        # Two submissions racing past the check above still hit the unique constraint.
        raise ValidationError(
            {"course_ids": ["Some of these courses are already registered."]}
        ) from exc

    codes = sorted(course.code for course in eligible.values())
    record(
        student.user,
        "registration.created",
        student,
        f"{student.matric_number} registered {', '.join(codes)} for {semester}",
        semester=semester.pk,
        courses=codes,
    )
    return registrations
