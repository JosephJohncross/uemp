from django.db import transaction
from django.db.models import Count, IntegerField, OuterRef, Q, Subquery
from django.db.models.functions import Coalesce
from rest_framework import mixins, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import SAFE_METHODS, IsAuthenticated
from rest_framework.response import Response

from apps.audit.services import record
from apps.core.permissions import (
    IsAdmin,
    IsReadOnly,
    IsStaff,
    IsSuperAdmin,
    Role,
    ensure_department_access,
    staff_department_id,
)
from apps.registration.models import CourseRegistration
from apps.results.models import ResultSheet

from . import services
from .models import (
    AcademicSession,
    Course,
    CourseAllocation,
    Department,
    Faculty,
    Program,
    Semester,
)
from .serializers import (
    AcademicSessionSerializer,
    CourseAllocationSerializer,
    CourseSerializer,
    DepartmentSerializer,
    FacultySerializer,
    ProgramSerializer,
    RegistrationToggleSerializer,
    SemesterSerializer,
)


class AuditedModelViewSet(viewsets.ModelViewSet):
    """Plain CRUD with no business rules beyond scope, recorded in the audit log."""

    audit_name = ""

    def perform_create(self, serializer):
        instance = serializer.save()
        record(self.request.user, f"{self.audit_name}.created", instance, f"Created {instance}")

    def perform_update(self, serializer):
        instance = serializer.save()
        record(self.request.user, f"{self.audit_name}.updated", instance, f"Updated {instance}")

    @transaction.atomic
    def perform_destroy(self, instance):
        record(self.request.user, f"{self.audit_name}.deleted", instance, f"Deleted {instance}")
        instance.delete()


class FacultyViewSet(AuditedModelViewSet):
    queryset = Faculty.objects.all()
    serializer_class = FacultySerializer
    permission_classes = [IsReadOnly | IsSuperAdmin]
    audit_name = "faculty"


class DepartmentViewSet(AuditedModelViewSet):
    serializer_class = DepartmentSerializer
    permission_classes = [IsReadOnly | IsSuperAdmin]
    audit_name = "department"

    def get_queryset(self):
        departments = Department.objects.select_related("faculty")
        if self.request.query_params.get("faculty"):
            departments = departments.filter(faculty_id=self.request.query_params["faculty"])
        return departments


class DepartmentScopedWriteMixin:
    """Department admins may only write records belonging to their own department."""

    def limit_writes_to_own_department(self, queryset):
        user = self.request.user
        if self.request.method not in SAFE_METHODS and user.role == Role.DEPT_ADMIN:
            queryset = queryset.filter(department_id=staff_department_id(user))
        return queryset

    def perform_create(self, serializer):
        ensure_department_access(self.request.user, serializer.validated_data["department"].pk)
        super().perform_create(serializer)

    def perform_update(self, serializer):
        department = serializer.validated_data.get("department", serializer.instance.department)
        ensure_department_access(self.request.user, department.pk)
        super().perform_update(serializer)


class ProgramViewSet(DepartmentScopedWriteMixin, AuditedModelViewSet):
    serializer_class = ProgramSerializer
    permission_classes = [IsReadOnly | IsAdmin]
    audit_name = "program"

    def get_queryset(self):
        programs = Program.objects.select_related("department")
        if self.request.query_params.get("department"):
            programs = programs.filter(department_id=self.request.query_params["department"])
        return self.limit_writes_to_own_department(programs)


class AcademicSessionViewSet(AuditedModelViewSet):
    queryset = AcademicSession.objects.prefetch_related("semesters__session")
    serializer_class = AcademicSessionSerializer
    permission_classes = [IsReadOnly | IsSuperAdmin]
    audit_name = "session"


class SemesterViewSet(AuditedModelViewSet):
    serializer_class = SemesterSerializer
    permission_classes = [IsReadOnly | IsSuperAdmin]
    audit_name = "semester"

    def get_queryset(self):
        semesters = Semester.objects.select_related("session")
        if self.request.query_params.get("session"):
            semesters = semesters.filter(session_id=self.request.query_params["session"])
        return semesters

    @action(detail=False, permission_classes=[IsAuthenticated])
    def current(self, request):
        return Response(SemesterSerializer(services.get_current_semester()).data)

    @action(detail=True, methods=["post"], url_path="set-current")
    def set_current(self, request, pk=None):
        semester = services.set_current_semester(self.get_object(), actor=request.user)
        return Response(SemesterSerializer(semester).data)

    @action(detail=True, methods=["post"])
    def registration(self, request, pk=None):
        serializer = RegistrationToggleSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        semester = services.set_registration_open(
            self.get_object(), serializer.validated_data["open"], actor=request.user
        )
        return Response(SemesterSerializer(semester).data)


class CourseViewSet(DepartmentScopedWriteMixin, AuditedModelViewSet):
    serializer_class = CourseSerializer
    audit_name = "course"

    def get_permissions(self):
        if self.request.method in SAFE_METHODS:
            return [IsStaff()]
        return [IsAdmin()]

    def get_queryset(self):
        courses = Course.objects.select_related("department").prefetch_related("programs")
        user = self.request.user
        if user.role != Role.SUPER_ADMIN:
            courses = courses.filter(department_id=staff_department_id(user))

        params = self.request.query_params
        for field in ("department", "level", "term"):
            if params.get(field):
                courses = courses.filter(**{field: params[field]})
        if params.get("program"):
            courses = courses.filter(programs=params["program"])
        if params.get("search"):
            courses = courses.filter(
                Q(code__icontains=params["search"]) | Q(title__icontains=params["search"])
            )
        return self.limit_writes_to_own_department(courses)


class CourseAllocationViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.CreateModelMixin,
    viewsets.GenericViewSet,
):
    """Creating an allocation for a course that already has one reassigns it."""

    serializer_class = CourseAllocationSerializer

    def get_permissions(self):
        if self.request.method in SAFE_METHODS:
            return [IsStaff()]
        return [IsAdmin()]

    def get_queryset(self):
        registered = (
            CourseRegistration.objects.filter(
                course=OuterRef("course"), semester=OuterRef("semester")
            )
            .order_by()
            .values("course")
            .annotate(total=Count("id"))
            .values("total")
        )
        sheets = ResultSheet.objects.filter(
            course=OuterRef("course"), semester=OuterRef("semester")
        )
        allocations = CourseAllocation.objects.select_related(
            "course__department", "semester__session", "lecturer__user"
        ).annotate(
            registered_count=Coalesce(Subquery(registered, output_field=IntegerField()), 0),
            result_sheet_id=Subquery(sheets.values("id")[:1]),
            result_status=Subquery(sheets.values("status")[:1]),
        )

        user = self.request.user
        if user.role == Role.LECTURER:
            allocations = allocations.filter(lecturer__user=user)
        elif user.role == Role.DEPT_ADMIN:
            allocations = allocations.filter(course__department_id=staff_department_id(user))

        semester = self.request.query_params.get("semester")
        if semester != "all" and self.action == "list":
            allocations = allocations.filter(
                semester_id=semester or services.get_current_semester().pk
            )
        return allocations.order_by("course__code")

    def perform_create(self, serializer):
        allocation = services.allocate_course(actor=self.request.user, **serializer.validated_data)
        serializer.instance = self.get_queryset().get(pk=allocation.pk)
