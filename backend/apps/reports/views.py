from rest_framework.response import Response
from rest_framework.views import APIView

from apps.academics.models import Semester
from apps.core.permissions import IsAdmin, Role, staff_department_id
from apps.registration.views import semester_from_params

from . import documents, services
from .pdf import pdf_response


def department_scope(user) -> int | None:
    return staff_department_id(user) if user.role == Role.DEPT_ADMIN else None


class OverviewReportView(APIView):
    permission_classes = [IsAdmin]

    def get(self, request):
        semester = Semester.objects.select_related("session").filter(is_current=True).first()
        department_id = department_scope(request.user)
        data = {
            "semester": str(semester) if semester else None,
            **services.overview(semester, department_id),
        }
        if department_id is None:
            data["by_department"] = services.department_breakdown(semester)
        return Response(data)


class CourseReportView(APIView):
    permission_classes = [IsAdmin]

    def get(self, request):
        semester = semester_from_params(request)
        return Response(
            {
                "semester": str(semester),
                "courses": services.course_report(semester, department_scope(request.user)),
            }
        )


class CourseReportExportView(APIView):
    permission_classes = [IsAdmin]

    def get(self, request):
        semester = semester_from_params(request)
        department_id = department_scope(request.user)
        scope = request.user.staff_profile.department.name if department_id else "All departments"
        content = documents.course_report(semester, department_id, scope)
        filename = (
            f"course-report-{semester.session.name.replace('/', '-')}-{semester.term.lower()}.pdf"
        )
        return pdf_response(filename, content)
