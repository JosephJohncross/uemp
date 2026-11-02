import pytest

from apps.audit.models import AuditLog
from apps.registration.models import CourseRegistration
from apps.results.models import ResultSheet

pytestmark = pytest.mark.django_db

Status = ResultSheet.Status


def url(sheet, action=""):
    return f"/api/result-sheets/{sheet.pk}/{action + '/' if action else ''}"


def registration_id(student, sheet):
    return CourseRegistration.objects.get(student=student, course=sheet.course).pk


def save_scores(client, sheet, *rows):
    scores = [
        {"registration": registration_id(student, sheet), "ca_score": ca, "exam_score": exam}
        for student, ca, exam in rows
    ]
    return client.put(url(sheet, "scores"), {"scores": scores}, format="json")


def fill_and_submit(world, api, sheet):
    lecturer = api(world.csc_lecturer)
    save_scores(lecturer, sheet, (world.student, 25, 50), (world.classmate, 10, 25))
    assert lecturer.post(url(sheet, "submit")).status_code == 200
    return lecturer


def status_of(sheet):
    sheet.refresh_from_db()
    return sheet.status


def test_lecturer_sees_class_list_with_empty_scores(world, api, csc101_sheet):
    response = api(world.csc_lecturer).get(url(csc101_sheet))

    assert response.status_code == 200
    assert [row["matric_number"] for row in response.data["rows"]] == ["CSC/25/001", "CSC/25/002"]
    assert all(row["total"] is None for row in response.data["rows"])


def test_saving_scores_computes_total_and_grade(world, api, csc101_sheet):
    response = save_scores(api(world.csc_lecturer), csc101_sheet, (world.student, 25, 50))

    assert response.status_code == 200
    row = response.data["rows"][0]
    assert (row["total"], row["grade"], row["grade_point"]) == (75, "A", 5)
    assert status_of(csc101_sheet) == Status.DRAFT


@pytest.mark.parametrize(("ca", "exam"), [(31, 50), (20, 71), (-1, 50)])
def test_scores_outside_allowed_range_are_rejected(world, api, csc101_sheet, ca, exam):
    response = save_scores(api(world.csc_lecturer), csc101_sheet, (world.student, ca, exam))

    assert response.status_code == 400


def test_lecturer_not_allocated_cannot_see_or_edit_sheet(world, api, csc101_sheet):
    client = api(world.other_csc_lecturer)

    assert client.get(url(csc101_sheet)).status_code == 404
    response = save_scores(client, csc101_sheet, (world.student, 25, 50))
    assert response.status_code == 404


def test_scores_only_for_students_registered_on_the_course(world, api, csc101_sheet):
    response = api(world.csc_lecturer).put(
        url(csc101_sheet, "scores"),
        {"scores": [{"registration": 999_999, "ca_score": 20, "exam_score": 40}]},
        format="json",
    )

    assert response.status_code == 400


def test_incomplete_sheet_cannot_be_submitted(world, api, csc101_sheet):
    client = api(world.csc_lecturer)
    save_scores(client, csc101_sheet, (world.student, 25, 50), (world.classmate, 10, None))

    response = client.post(url(csc101_sheet, "submit"))

    assert response.status_code == 400
    assert "CSC/25/002" in response.data["detail"]
    assert status_of(csc101_sheet) == Status.DRAFT


def test_submitted_sheet_is_locked_for_the_lecturer(world, api, csc101_sheet):
    lecturer = fill_and_submit(world, api, csc101_sheet)

    response = save_scores(lecturer, csc101_sheet, (world.student, 30, 70))

    assert response.status_code == 400
    assert status_of(csc101_sheet) == Status.SUBMITTED


def test_results_cannot_be_approved_before_submission(world, api, csc101_sheet):
    response = api(world.csc_admin).post(url(csc101_sheet, "approve"))

    assert response.status_code == 400
    assert status_of(csc101_sheet) == Status.DRAFT


def test_only_owning_department_admin_can_review(world, api, csc101_sheet):
    fill_and_submit(world, api, csc101_sheet)

    assert api(world.mth_admin).post(url(csc101_sheet, "approve")).status_code == 404
    assert api(world.csc_lecturer).post(url(csc101_sheet, "approve")).status_code == 403
    assert api(world.super_admin).post(url(csc101_sheet, "approve")).status_code == 403
    assert status_of(csc101_sheet) == Status.SUBMITTED


def test_admin_cannot_approve_results_they_submitted(world, api, csc101_sheet):
    fill_and_submit(world, api, csc101_sheet)
    world.csc_lecturer.role = "DEPT_ADMIN"
    world.csc_lecturer.save()

    response = api(world.csc_lecturer).post(url(csc101_sheet, "approve"))

    assert response.status_code == 403
    assert status_of(csc101_sheet) == Status.SUBMITTED


def test_rejection_requires_feedback_and_reopens_editing(world, api, csc101_sheet):
    lecturer = fill_and_submit(world, api, csc101_sheet)
    admin = api(world.csc_admin)

    assert admin.post(url(csc101_sheet, "reject"), {}, format="json").status_code == 400

    response = admin.post(url(csc101_sheet, "reject"), {"comment": "Recheck CSC/25/002"})
    assert response.status_code == 200
    assert response.data["status"] == Status.RETURNED
    assert lecturer.get(url(csc101_sheet)).data["review_comment"] == "Recheck CSC/25/002"
    assert save_scores(lecturer, csc101_sheet, (world.classmate, 12, 30)).status_code == 200
    assert lecturer.post(url(csc101_sheet, "submit")).status_code == 200


def test_students_see_only_approved_results(world, api, csc101_sheet):
    student = api(world.student.user)
    fill_and_submit(world, api, csc101_sheet)

    assert student.get("/api/student/results/").data["semesters"] == []

    api(world.csc_admin).post(url(csc101_sheet, "approve"))
    results = student.get("/api/student/results/").data

    assert results["semesters"][0]["scores"][0]["grade"] == "A"
    assert results["cgpa"] == "5.00"


def test_reopening_hides_results_until_reapproved(world, api, csc101_sheet):
    fill_and_submit(world, api, csc101_sheet)
    admin = api(world.csc_admin)
    admin.post(url(csc101_sheet, "approve"))

    assert admin.post(url(csc101_sheet, "reopen"), {}, format="json").status_code == 400
    response = admin.post(url(csc101_sheet, "reopen"), {"comment": "Exam board query"})

    assert response.data["status"] == Status.RETURNED
    assert api(world.student.user).get("/api/student/results/").data["semesters"] == []


def test_cgpa_weights_results_by_course_units(world, api, csc101_sheet):
    register_mth = api(world.student.user).post(
        "/api/student/registration/", {"course_ids": [world.courses.mth101.pk]}, format="json"
    )
    assert register_mth.status_code == 201
    fill_and_submit(world, api, csc101_sheet)
    api(world.csc_admin).post(url(csc101_sheet, "approve"))

    mth_sheet = ResultSheet.objects.get(course=world.courses.mth101)
    mth_lecturer = api(world.mth_lecturer)
    save_scores(mth_lecturer, mth_sheet, (world.student, 15, 35))
    mth_lecturer.post(url(mth_sheet, "submit"))
    api(world.mth_admin).post(url(mth_sheet, "approve"))

    results = api(world.student.user).get("/api/student/results/").data

    # CSC101: 75 -> A (5); MTH101: 50 -> C (3); both 3 units, so (15 + 9) / 6
    assert results["semesters"][0]["gpa"] == "4.00"
    assert results["total_units"] == 6


def test_every_step_is_audited_with_score_changes(world, api, csc101_sheet):
    lecturer = fill_and_submit(world, api, csc101_sheet)
    api(world.csc_admin).post(url(csc101_sheet, "reject"), {"comment": "Fix it"})
    save_scores(lecturer, csc101_sheet, (world.classmate, 12, 30))

    history = lecturer.get(url(csc101_sheet)).data["history"]

    assert [entry["action"] for entry in history] == [
        "result.scores_saved",
        "result.reject",
        "result.submitted",
        "result.scores_saved",
    ]
    latest_change = AuditLog.objects.filter(action="result.scores_saved").first()
    assert latest_change.details["changes"] == [
        {"matric_number": "CSC/25/002", "before": [10, 25], "after": [12, 30]}
    ]
