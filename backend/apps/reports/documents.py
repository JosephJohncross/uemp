"""Downloadable PDFs, built from the same services that back the API, so both always agree."""

from django.db.models import QuerySet

from apps.academics.models import Semester
from apps.accounts.models import StudentProfile
from apps.registration.models import CourseRegistration
from apps.registration.services import registered_units
from apps.results.models import ResultSheet
from apps.results.services import sheet_registrations, sheet_summary, student_results

from . import services
from .pdf import Section, render_pdf


def _student_details(student: StudentProfile) -> list[tuple[str, str]]:
    program = student.program
    return [
        ("Name", student.user.get_full_name()),
        ("Matric number", student.matric_number),
        ("Program", program.name),
        ("Department", f"{program.department.name}, {program.department.faculty.name}"),
        ("Level", f"{student.level} level"),
    ]


def registration_slip(student: StudentProfile, semester: Semester) -> bytes:
    registrations = (
        CourseRegistration.objects.filter(student=student, semester=semester)
        .select_related("course__department")
        .order_by("course__code")
    )
    rows = [
        [r.course.code, r.course.title, r.course.department.name, r.course.units]
        for r in registrations
    ]
    total = registered_units(student, semester)
    return render_pdf(
        "Course registration slip",
        [*_student_details(student), ("Semester", str(semester))],
        [
            Section(
                columns=["Code", "Course title", "Department", "Units"],
                rows=rows,
                numeric={3},
                widths=[1.2, 4, 2.6, 0.8],
                note=f"{len(rows)} course(s), {total} units registered.",
            )
        ],
    )


def result_statement(student: StudentProfile) -> bytes:
    results = student_results(student)
    sections = [
        Section(
            heading=str(entry["semester"]),
            columns=["Code", "Course title", "Units", "CA", "Exam", "Total", "Grade", "Point"],
            rows=[
                [
                    score.registration.course.code,
                    score.registration.course.title,
                    score.registration.course.units,
                    score.ca_score,
                    score.exam_score,
                    score.total,
                    score.grade,
                    score.grade_point,
                ]
                for score in entry["scores"]
            ],
            numeric={2, 3, 4, 5, 7},
            widths=[1.2, 4, 0.8, 0.7, 0.8, 0.8, 0.8, 0.8],
            note=f"Semester GPA {entry['gpa']} · {entry['total_units']} units",
        )
        for entry in results["semesters"]
    ]
    return render_pdf(
        "Statement of results",
        [
            *_student_details(student),
            ("CGPA", f"{results['cgpa']} (5.00 scale)"),
            ("Units earned", str(results["total_units"])),
        ],
        sections or [Section(columns=[], rows=[], heading="No approved results yet")],
    )


def _score_columns(registration: CourseRegistration) -> list:
    score = getattr(registration, "score", None)
    if score is None:
        return ["", "", "", ""]
    return [score.ca_score, score.exam_score, score.total, score.grade]


def class_list(sheet: ResultSheet) -> bytes:
    registrations = list(sheet_registrations(sheet))
    summary = sheet_summary(registrations)

    rows = [
        [
            index,
            r.student.matric_number,
            r.student.user.get_full_name(),
            r.student.level,
            *_score_columns(r),
        ]
        for index, r in enumerate(registrations, start=1)
    ]
    average = summary["average"] if summary["average"] is not None else "—"
    return render_pdf(
        "Class list",
        [
            ("Course", f"{sheet.course.code} · {sheet.course.title}"),
            ("Semester", str(sheet.semester)),
            ("Units", str(sheet.course.units)),
            ("Department", sheet.course.department.name),
            ("Result status", sheet.get_status_display()),
        ],
        [
            Section(
                columns=["#", "Matric number", "Name", "Level", "CA", "Exam", "Total", "Grade"],
                rows=rows,
                numeric={0, 3, 4, 5, 6},
                widths=[0.5, 1.8, 3, 0.9, 0.8, 0.9, 0.9, 0.9],
                note=(
                    f"{summary['registered']} registered · {summary['graded']} graded · "
                    f"average {average} · {summary['passed']} passed"
                ),
            )
        ],
    )


def student_list(students: QuerySet[StudentProfile], scope: str) -> bytes:
    rows = [
        [
            index,
            s.matric_number,
            s.user.get_full_name(),
            s.program.name,
            s.level,
            s.user.get_status_display(),
        ]
        for index, s in enumerate(students, start=1)
    ]
    return render_pdf(
        "Student list",
        [("Scope", scope), ("Students", str(len(rows)))],
        [
            Section(
                columns=["#", "Matric number", "Name", "Program", "Level", "Status"],
                rows=rows,
                numeric={0, 4},
                widths=[0.5, 1.8, 2.6, 3.2, 0.9, 1.2],
            )
        ],
    )


def course_report(semester: Semester, department_id: int | None, scope: str) -> bytes:
    report = services.course_report(semester, department_id)
    total_registered = sum(c["registered"] for c in report)
    rows = [
        [
            c["code"],
            c["title"],
            c["lecturer"] or "—",
            c["registered"],
            c["average"] if c["average"] is not None else "—",
            f"{c['pass_rate']}%" if c["pass_rate"] is not None else "—",
            ResultSheet.Status(c["result_status"]).label if c["result_status"] else "—",
        ]
        for c in report
    ]
    return render_pdf(
        "Course report",
        [("Semester", str(semester)), ("Scope", scope)],
        [
            Section(
                columns=[
                    "Code",
                    "Title",
                    "Lecturer",
                    "Students",
                    "Average",
                    "Pass rate",
                    "Results",
                ],
                rows=rows,
                numeric={3, 4, 5},
                widths=[1.1, 2.9, 2.4, 1.25, 1.25, 1.1, 1.4],
                note=f"{len(rows)} course(s), {total_registered} registrations.",
            )
        ],
    )
