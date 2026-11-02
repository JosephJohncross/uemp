from collections import Counter
from itertools import groupby

from django.db import transaction
from django.db.models import QuerySet
from django.utils import timezone
from rest_framework.exceptions import PermissionDenied, ValidationError

from apps.academics.models import CourseAllocation
from apps.accounts.models import StudentProfile, User
from apps.audit.models import AuditLog
from apps.audit.services import record
from apps.core.permissions import staff_department_id
from apps.registration.models import CourseRegistration

from .grading import calculate_gpa, grade_for
from .models import ResultSheet, Score

Status = ResultSheet.Status

# action -> (statuses it may start from, status it moves to)
TRANSITIONS = {
    "submit": ({Status.DRAFT, Status.RETURNED}, Status.SUBMITTED),
    "approve": ({Status.SUBMITTED}, Status.APPROVED),
    "reject": ({Status.SUBMITTED}, Status.RETURNED),
    "reopen": ({Status.APPROVED}, Status.RETURNED),
}


def _transition(sheet: ResultSheet, action: str) -> None:
    allowed_from, target = TRANSITIONS[action]
    if sheet.status not in allowed_from:
        status = sheet.get_status_display().lower()
        raise ValidationError({"detail": f"Can't {action} a result sheet that is {status}."})
    sheet.status = target


def _lock(sheet: ResultSheet) -> ResultSheet:
    return ResultSheet.objects.select_for_update().select_related("course").get(pk=sheet.pk)


def _ensure_allocated_lecturer(sheet: ResultSheet, user: User) -> None:
    is_allocated = CourseAllocation.objects.filter(
        course_id=sheet.course_id, semester_id=sheet.semester_id, lecturer__user=user
    ).exists()
    if not is_allocated:
        raise PermissionDenied("Only the lecturer allocated to this course can change its results.")


def _ensure_department_reviewer(sheet: ResultSheet, user: User) -> None:
    if user.role != User.Role.DEPT_ADMIN or staff_department_id(user) != sheet.course.department_id:
        raise PermissionDenied(
            "Only the admin of the department that owns this course can review it."
        )
    if sheet.submitted_by_id == user.pk:
        raise PermissionDenied("You can't review results you submitted yourself.")


def sheet_registrations(sheet: ResultSheet) -> QuerySet[CourseRegistration]:
    return (
        CourseRegistration.objects.filter(course_id=sheet.course_id, semester_id=sheet.semester_id)
        .select_related("student__user", "student__program", "score")
        .order_by("student__matric_number")
    )


def _existing_score(registration: CourseRegistration) -> Score | None:
    return getattr(registration, "score", None)


def _apply_grade(score: Score) -> None:
    if score.ca_score is None or score.exam_score is None:
        score.total, score.grade, score.grade_point = None, "", None
        return
    score.total = score.ca_score + score.exam_score
    score.grade, score.grade_point = grade_for(score.total)


@transaction.atomic
def save_scores(*, sheet: ResultSheet, actor: User, entries: list[dict]) -> ResultSheet:
    sheet = _lock(sheet)
    _ensure_allocated_lecturer(sheet, actor)
    if not sheet.is_editable:
        status = sheet.get_status_display().lower()
        raise ValidationError({"detail": f"This result sheet is {status} and can't be edited."})

    registrations = {r.pk: r for r in sheet_registrations(sheet)}
    changes = []
    for entry in entries:
        registration = registrations.get(entry["registration"])
        if registration is None:
            raise ValidationError(
                {"scores": [f"Registration {entry['registration']} is not on this course's list."]}
            )
        score = _existing_score(registration) or Score(sheet=sheet, registration=registration)
        before = [score.ca_score, score.exam_score]
        after = [entry["ca_score"], entry["exam_score"]]
        if score.pk and before == after:
            continue
        score.ca_score, score.exam_score = after
        _apply_grade(score)
        score.save()
        changes.append(
            {"matric_number": registration.student.matric_number, "before": before, "after": after}
        )

    if changes:
        # Each change keeps its before/after values so edits to a returned sheet are traceable.
        record(
            actor,
            "result.scores_saved",
            sheet,
            f"Saved {len(changes)} score(s) for {sheet.course.code}",
            changes=changes,
        )
    return sheet


@transaction.atomic
def submit_sheet(*, sheet: ResultSheet, actor: User) -> ResultSheet:
    sheet = _lock(sheet)
    _ensure_allocated_lecturer(sheet, actor)
    _transition(sheet, "submit")

    registrations = list(sheet_registrations(sheet))
    if not registrations:
        raise ValidationError({"detail": "No students are registered for this course."})
    incomplete = [
        r.student.matric_number
        for r in registrations
        if (score := _existing_score(r)) is None or score.total is None
    ]
    if incomplete:
        raise ValidationError(
            {"detail": f"Enter both CA and exam scores for: {', '.join(incomplete)}."}
        )

    sheet.submitted_by = actor
    sheet.submitted_at = timezone.now()
    sheet.reviewed_by = None
    sheet.reviewed_at = None
    sheet.review_comment = ""
    sheet.save()
    record(actor, "result.submitted", sheet, f"Submitted {sheet.course.code} results for review")
    return sheet


def _review(sheet: ResultSheet, actor: User, action: str, comment: str, summary: str):
    sheet = _lock(sheet)
    _ensure_department_reviewer(sheet, actor)
    _transition(sheet, action)
    sheet.reviewed_by = actor
    sheet.reviewed_at = timezone.now()
    sheet.review_comment = comment
    sheet.save()
    record(
        actor, f"result.{action}", sheet, summary.format(code=sheet.course.code), comment=comment
    )
    return sheet


def _require_comment(comment: str) -> str:
    comment = comment.strip()
    if not comment:
        raise ValidationError({"comment": ["Explain what needs correcting."]})
    return comment


@transaction.atomic
def approve_sheet(*, sheet: ResultSheet, actor: User, comment: str = "") -> ResultSheet:
    return _review(sheet, actor, "approve", comment.strip(), "Approved {code} results")


@transaction.atomic
def reject_sheet(*, sheet: ResultSheet, actor: User, comment: str = "") -> ResultSheet:
    comment = _require_comment(comment)
    return _review(sheet, actor, "reject", comment, "Returned {code} results for correction")


@transaction.atomic
def reopen_sheet(*, sheet: ResultSheet, actor: User, comment: str = "") -> ResultSheet:
    comment = _require_comment(comment)
    return _review(sheet, actor, "reopen", comment, "Reopened approved {code} results")


def sheet_summary(registrations: list[CourseRegistration]) -> dict:
    scores = [s for r in registrations if (s := _existing_score(r)) and s.total is not None]
    totals = [s.total for s in scores]
    return {
        "registered": len(registrations),
        "graded": len(scores),
        "average": round(sum(totals) / len(totals), 1) if totals else None,
        "highest": max(totals, default=None),
        "lowest": min(totals, default=None),
        "passed": sum(1 for s in scores if s.grade_point),
        "grade_distribution": dict(Counter(s.grade for s in scores)),
    }


def sheet_history(sheet: ResultSheet) -> QuerySet[AuditLog]:
    return AuditLog.objects.filter(
        target_type=ResultSheet._meta.model_name, target_id=str(sheet.pk)
    ).select_related("actor")


def student_results(student: StudentProfile) -> dict:
    """Approved results only, grouped by semester, with GPA per semester and overall CGPA."""
    scores = (
        Score.objects.filter(registration__student=student, sheet__status=Status.APPROVED)
        .select_related("registration__course", "registration__semester__session")
        .order_by(
            "registration__semester__session__start_date",
            "registration__semester__term",
            "registration__course__code",
        )
    )

    semesters = []
    for semester, semester_scores in groupby(scores, key=lambda s: s.registration.semester):
        semester_scores = list(semester_scores)
        units_and_points = [(s.registration.course.units, s.grade_point) for s in semester_scores]
        semesters.append(
            {
                "semester": semester,
                "scores": semester_scores,
                "total_units": sum(units for units, _ in units_and_points),
                "gpa": calculate_gpa(units_and_points),
            }
        )

    all_results = [(s.registration.course.units, s.grade_point) for s in scores]
    return {
        "semesters": semesters,
        "total_units": sum(units for units, _ in all_results),
        "cgpa": calculate_gpa(all_results),
    }
