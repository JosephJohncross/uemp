import base64
import re
import zlib

import pytest

from apps.registration.models import CourseRegistration
from apps.results.models import ResultSheet
from apps.results.services import approve_sheet, save_scores, submit_sheet

pytestmark = pytest.mark.django_db


def pdf_text(content: bytes) -> str:
    """The text drawn on every page. ReportLab stores page content ASCII85- and Flate-encoded."""
    text = []
    for stream in re.findall(rb"stream\r?\n(.*?)endstream", content, re.S):
        try:
            raw = base64.a85decode(stream.strip().removesuffix(b"~>"))
            text.append(zlib.decompress(raw).decode("latin-1"))
        except (ValueError, zlib.error):
            continue
    return "".join(text)


def assert_pdf(response, filename_part):
    assert response.status_code == 200
    assert response["Content-Type"] == "application/pdf"
    assert "attachment" in response["Content-Disposition"]
    assert filename_part in response["Content-Disposition"]
    assert response.content.startswith(b"%PDF")


def grade_csc101(world, sheet):
    entries = [
        {
            "registration": CourseRegistration.objects.get(student=student, course=sheet.course).pk,
            "ca_score": ca,
            "exam_score": exam,
        }
        for student, ca, exam in ((world.student, 25, 50), (world.classmate, 10, 25))
    ]
    save_scores(sheet=sheet, actor=world.csc_lecturer, entries=entries)
    submit_sheet(sheet=sheet, actor=world.csc_lecturer)


def test_registration_slip_lists_the_students_courses(world, api, csc101_sheet):
    response = api(world.student.user).get("/api/student/registration/slip/")

    assert_pdf(response, "registration-slip-CSC-25-001.pdf")
    text = pdf_text(response.content)
    assert "CSC/25/001" in text
    assert "CSC101" in text


def test_result_statement_includes_only_approved_results(world, api, csc101_sheet):
    client = api(world.student.user)
    grade_csc101(world, csc101_sheet)

    before = pdf_text(client.get("/api/student/results/statement/").content)
    approve_sheet(sheet=csc101_sheet, actor=world.csc_admin)
    after = pdf_text(client.get("/api/student/results/statement/").content)

    assert "CSC101" not in before
    assert "CSC101" in after
    assert "5.00" in after


def test_class_list_for_the_allocated_lecturer(world, api, csc101_sheet):
    grade_csc101(world, csc101_sheet)

    response = api(world.csc_lecturer).get(f"/api/result-sheets/{csc101_sheet.pk}/class-list/")

    assert_pdf(response, "class-list-CSC101")
    text = pdf_text(response.content)
    assert "CSC/25/001" in text
    assert "CSC/25/002" in text


@pytest.mark.parametrize(
    ("user_attr", "status"),
    [("other_csc_lecturer", 404), ("mth_admin", 404), ("super_admin", 200)],
)
def test_class_list_is_scoped(world, api, csc101_sheet, user_attr, status):
    response = api(getattr(world, user_attr)).get(
        f"/api/result-sheets/{csc101_sheet.pk}/class-list/"
    )

    assert response.status_code == status


def test_student_cannot_download_a_class_list(world, api, csc101_sheet):
    response = api(world.student.user).get(f"/api/result-sheets/{csc101_sheet.pk}/class-list/")

    assert response.status_code == 403


def test_student_list_export_is_scoped_to_department(world, api):
    response = api(world.csc_admin).get("/api/students/export/")

    assert_pdf(response, "student-list.pdf")
    text = pdf_text(response.content)
    assert "CSC/25/001" in text
    assert "MTH/25/001" not in text


def test_course_report_export(world, api, csc101_sheet):
    response = api(world.csc_admin).get("/api/reports/courses/export/")

    assert_pdf(response, "course-report-2025-2026-first.pdf")
    assert "CSC101" in pdf_text(response.content)


@pytest.mark.parametrize(
    ("role_attr", "path"),
    [
        ("csc_lecturer", "/api/student/registration/slip/"),
        ("csc_admin", "/api/student/results/statement/"),
        ("csc_lecturer", "/api/students/export/"),
        ("student", "/api/reports/courses/export/"),
    ],
)
def test_documents_refused_for_other_roles(world, api, role_attr, path):
    user = getattr(world, role_attr)
    user = getattr(user, "user", user)

    assert api(user).get(path).status_code == 403


def test_documents_require_sign_in(world, api, csc101_sheet):
    sheet = ResultSheet.objects.get(pk=csc101_sheet.pk)

    for path in (
        "/api/student/registration/slip/",
        "/api/student/results/statement/",
        f"/api/result-sheets/{sheet.pk}/class-list/",
        "/api/students/export/",
        "/api/reports/courses/export/",
    ):
        assert api().get(path).status_code == 403
