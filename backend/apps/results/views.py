from django.db.models import Count, Exists, IntegerField, OuterRef, Subquery, Value
from django.db.models.functions import Coalesce, Concat
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.academics.models import CourseAllocation
from apps.audit.serializers import AuditLogSerializer
from apps.core.permissions import (
    IsDeptAdmin,
    IsLecturer,
    IsStaff,
    IsStudent,
    Role,
    staff_department_id,
)
from apps.registration.models import CourseRegistration
from apps.reports import documents
from apps.reports.pdf import pdf_response

from . import services
from .models import ResultSheet
from .serializers import (
    ResultSheetSerializer,
    ReviewSerializer,
    SaveScoresSerializer,
    ScoreRowSerializer,
    StudentResultsSerializer,
)

LECTURER_ACTIONS = {"scores", "submit"}
REVIEWER_ACTIONS = {"approve", "reject", "reopen"}


class ResultSheetViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = ResultSheetSerializer

    def get_permissions(self):
        if self.action in LECTURER_ACTIONS:
            return [IsLecturer()]
        if self.action in REVIEWER_ACTIONS:
            return [IsDeptAdmin()]
        return [IsStaff()]

    def get_queryset(self):
        allocations = CourseAllocation.objects.filter(
            course=OuterRef("course"), semester=OuterRef("semester")
        )
        registered = (
            CourseRegistration.objects.filter(
                course=OuterRef("course"), semester=OuterRef("semester")
            )
            .order_by()
            .values("course")
            .annotate(total=Count("id"))
            .values("total")
        )
        sheets = ResultSheet.objects.select_related(
            "course__department", "semester__session", "submitted_by", "reviewed_by"
        ).annotate(
            lecturer_name=Subquery(
                allocations.annotate(
                    name=Concat(
                        "lecturer__title",
                        Value(" "),
                        "lecturer__user__first_name",
                        Value(" "),
                        "lecturer__user__last_name",
                    )
                ).values("name")[:1]
            ),
            registered_count=Coalesce(Subquery(registered, output_field=IntegerField()), 0),
        )

        user = self.request.user
        if user.role == Role.LECTURER:
            sheets = sheets.filter(Exists(allocations.filter(lecturer__user=user)))
        elif user.role == Role.DEPT_ADMIN:
            sheets = sheets.filter(course__department_id=staff_department_id(user))

        params = self.request.query_params
        for field in ("status", "semester", "course"):
            if params.get(field):
                sheets = sheets.filter(**{field: params[field]})
        if params.get("department"):
            sheets = sheets.filter(course__department_id=params["department"])
        return sheets.order_by("-updated_at")

    def retrieve(self, request, *args, **kwargs):
        sheet = self.get_object()
        registrations = list(services.sheet_registrations(sheet))
        return Response(
            {
                **ResultSheetSerializer(sheet).data,
                "rows": ScoreRowSerializer(registrations, many=True).data,
                "summary": services.sheet_summary(registrations),
                "history": AuditLogSerializer(services.sheet_history(sheet), many=True).data,
            }
        )

    def _respond(self, sheet):
        return self.retrieve(self.request, pk=sheet.pk)

    @action(detail=True, url_path="class-list")
    def class_list(self, request, pk=None):
        sheet = self.get_object()
        filename = (
            f"class-list-{sheet.course.code}-{sheet.semester.session.name.replace('/', '-')}.pdf"
        )
        return pdf_response(filename, documents.class_list(sheet))

    @action(detail=True, methods=["put"])
    def scores(self, request, pk=None):
        serializer = SaveScoresSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        sheet = services.save_scores(
            sheet=self.get_object(), actor=request.user, entries=serializer.validated_data["scores"]
        )
        return self._respond(sheet)

    @action(detail=True, methods=["post"])
    def submit(self, request, pk=None):
        return self._respond(services.submit_sheet(sheet=self.get_object(), actor=request.user))

    def _review(self, request, service):
        serializer = ReviewSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        sheet = service(sheet=self.get_object(), actor=request.user, **serializer.validated_data)
        return self._respond(sheet)

    @action(detail=True, methods=["post"])
    def approve(self, request, pk=None):
        return self._review(request, services.approve_sheet)

    @action(detail=True, methods=["post"])
    def reject(self, request, pk=None):
        return self._review(request, services.reject_sheet)

    @action(detail=True, methods=["post"])
    def reopen(self, request, pk=None):
        return self._review(request, services.reopen_sheet)


class StudentResultsView(APIView):
    permission_classes = [IsStudent]

    def get(self, request):
        results = services.student_results(request.user.student_profile)
        return Response(StudentResultsSerializer(results).data)


class StudentResultStatementView(APIView):
    permission_classes = [IsStudent]

    def get(self, request):
        student = request.user.student_profile
        filename = f"result-statement-{student.matric_number.replace('/', '-')}.pdf"
        return pdf_response(filename, documents.result_statement(student))
