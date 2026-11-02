from django.conf import settings
from django.db.models import Q
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.generics import get_object_or_404
from rest_framework.response import Response

from apps.academics.models import Semester
from apps.academics.serializers import SemesterSerializer
from apps.academics.services import get_current_semester
from apps.core.permissions import IsAdmin, IsStudent, Role, staff_department_id

from . import services
from .models import CourseRegistration
from .serializers import (
    AvailableCourseSerializer,
    CourseRegistrationSerializer,
    RegisterCoursesSerializer,
)


def semester_from_params(request) -> Semester:
    semester_id = request.query_params.get("semester")
    if semester_id:
        return get_object_or_404(Semester.objects.select_related("session"), pk=semester_id)
    return get_current_semester()


class StudentRegistrationViewSet(viewsets.ViewSet):
    """The signed-in student's own course registration."""

    permission_classes = [IsStudent]

    def list(self, request):
        student = request.user.student_profile
        semester = semester_from_params(request)
        registrations = CourseRegistration.objects.filter(
            student=student, semester=semester
        ).select_related(
            "course__department", "semester__session", "student__user", "student__program"
        )
        return Response(
            {
                "semester": SemesterSerializer(semester).data,
                "total_units": services.registered_units(student, semester),
                "registrations": CourseRegistrationSerializer(registrations, many=True).data,
            }
        )

    def create(self, request):
        serializer = RegisterCoursesSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        registrations = services.register_courses(
            student=request.user.student_profile, **serializer.validated_data
        )
        return Response(
            CourseRegistrationSerializer(registrations, many=True).data,
            status=status.HTTP_201_CREATED,
        )

    @action(detail=False)
    def available(self, request):
        student = request.user.student_profile
        semester = get_current_semester()
        registered_ids = set(
            CourseRegistration.objects.filter(student=student, semester=semester).values_list(
                "course_id", flat=True
            )
        )
        courses = services.available_courses(student, semester)
        return Response(
            {
                "semester": SemesterSerializer(semester).data,
                "max_units": settings.MAX_UNITS_PER_SEMESTER,
                "registered_units": services.registered_units(student, semester),
                "courses": AvailableCourseSerializer(
                    courses, many=True, context={"registered_ids": registered_ids}
                ).data,
            }
        )


class CourseRegistrationViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = CourseRegistrationSerializer
    permission_classes = [IsAdmin]

    def get_queryset(self):
        registrations = CourseRegistration.objects.select_related(
            "student__user", "student__program", "course__department", "semester__session"
        ).order_by("course__code", "student__matric_number")

        user = self.request.user
        if user.role == Role.DEPT_ADMIN:
            department_id = staff_department_id(user)
            registrations = registrations.filter(
                Q(student__program__department_id=department_id)
                | Q(course__department_id=department_id)
            )

        params = self.request.query_params
        if self.action == "list":
            registrations = registrations.filter(semester=semester_from_params(self.request))
        for field in ("course", "student"):
            if params.get(field):
                registrations = registrations.filter(**{field: params[field]})
        if params.get("level"):
            registrations = registrations.filter(student__level=params["level"])
        if params.get("search"):
            search = params["search"]
            registrations = registrations.filter(
                Q(student__matric_number__icontains=search)
                | Q(student__user__first_name__icontains=search)
                | Q(student__user__last_name__icontains=search)
                | Q(course__code__icontains=search)
            )
        return registrations
