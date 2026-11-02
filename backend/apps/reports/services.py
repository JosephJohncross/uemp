from django.db.models import Avg, Count, Q

from apps.academics.models import (
    Course,
    CourseAllocation,
    Department,
    Faculty,
    Program,
    Semester,
)
from apps.accounts.models import StaffProfile, StudentProfile, User
from apps.registration.models import CourseRegistration
from apps.results.models import ResultSheet, Score


def overview(semester: Semester | None, department_id: int | None = None) -> dict:
    """Headline counts for an admin dashboard; department_id narrows it to one department."""
    in_department = {} if department_id is None else {"department_id": department_id}
    students = StudentProfile.objects.filter(
        **({} if department_id is None else {"program__department_id": department_id})
    )
    staff = StaffProfile.objects.filter(**in_department)
    courses = Course.objects.filter(**in_department)

    data = {
        "students": students.count(),
        "active_students": students.filter(user__status=User.Status.ACTIVE).count(),
        "lecturers": staff.filter(user__role=User.Role.LECTURER).count(),
        "courses": courses.count(),
        "programs": Program.objects.filter(**in_department).count(),
    }
    if department_id is None:
        data["faculties"] = Faculty.objects.count()
        data["departments"] = Department.objects.count()
        data["users_by_status"] = dict(
            User.objects.values_list("status").annotate(total=Count("id")).order_by()
        )

    if semester is None:
        return data

    registrations = CourseRegistration.objects.filter(semester=semester)
    sheets = ResultSheet.objects.filter(semester=semester)
    if department_id is not None:
        registrations = registrations.filter(
            Q(student__program__department_id=department_id)
            | Q(course__department_id=department_id)
        )
        sheets = sheets.filter(course__department_id=department_id)

    data["registrations"] = registrations.count()
    data["students_registered"] = registrations.values("student").distinct().count()
    data["result_sheets"] = {status: 0 for status in ResultSheet.Status.values} | dict(
        sheets.values_list("status").annotate(total=Count("id")).order_by()
    )
    return data


def department_breakdown(semester: Semester | None) -> list[dict]:
    """Per-department totals for the university-wide dashboard."""
    departments = Department.objects.select_related("faculty").annotate(
        student_total=Count("programs__students", distinct=True),
        course_total=Count("courses", distinct=True),
        lecturer_total=Count(
            "staff", filter=Q(staff__user__role=User.Role.LECTURER), distinct=True
        ),
        pending_results=Count(
            "courses__result_sheets",
            filter=Q(
                courses__result_sheets__status=ResultSheet.Status.SUBMITTED,
                courses__result_sheets__semester=semester,
            ),
            distinct=True,
        ),
    )
    return [
        {
            "id": d.pk,
            "name": d.name,
            "code": d.code,
            "faculty": d.faculty.name,
            "students": d.student_total,
            "courses": d.course_total,
            "lecturers": d.lecturer_total,
            "pending_results": d.pending_results,
        }
        for d in departments
    ]


def course_report(semester: Semester, department_id: int | None = None) -> list[dict]:
    """Registration numbers and, where scores exist, performance for each course offered."""
    courses = (
        Course.objects.filter(
            Q(registrations__semester=semester) | Q(allocations__semester=semester)
        )
        .distinct()
        .select_related("department")
        .order_by("code")
    )
    if department_id is not None:
        courses = courses.filter(department_id=department_id)

    sheets = {
        sheet.course_id: sheet
        for sheet in ResultSheet.objects.filter(semester=semester, course__in=courses)
    }
    lecturers = {
        allocation.course_id: str(allocation.lecturer)
        for allocation in CourseAllocation.objects.filter(
            semester=semester, course__in=courses
        ).select_related("lecturer__user")
    }
    registered = dict(
        CourseRegistration.objects.filter(semester=semester, course__in=courses)
        .values_list("course")
        .annotate(total=Count("id"))
        .order_by()
    )
    performance = {
        row["registration__course"]: row
        for row in Score.objects.filter(
            registration__semester=semester,
            registration__course__in=courses,
            total__isnull=False,
        )
        .values("registration__course")
        .annotate(
            average=Avg("total"),
            graded=Count("id"),
            passed=Count("id", filter=Q(grade_point__gt=0)),
        )
        .order_by()
    }

    report = []
    for course in courses:
        stats = performance.get(course.pk, {})
        graded = stats.get("graded", 0)
        sheet = sheets.get(course.pk)
        report.append(
            {
                "course": course.pk,
                "code": course.code,
                "title": course.title,
                "units": course.units,
                "level": course.level,
                "department": course.department.name,
                "lecturer": lecturers.get(course.pk),
                "registered": registered.get(course.pk, 0),
                "result_status": sheet.status if sheet else None,
                "result_sheet": sheet.pk if sheet else None,
                "graded": graded,
                "average": round(stats["average"], 1) if graded else None,
                "pass_rate": round(100 * stats["passed"] / graded) if graded else None,
            }
        )
    return report
