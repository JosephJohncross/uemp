from django.contrib.auth import login, logout, update_session_auth_hash
from django.db.models import Q
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_protect, ensure_csrf_cookie
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from apps.audit.services import record
from apps.core.permissions import IsAdmin, IsSuperAdmin, Role, staff_department_id
from apps.reports import documents
from apps.reports.pdf import pdf_response

from . import services
from .models import StaffProfile, StudentProfile, User
from .serializers import (
    LoginSerializer,
    MeSerializer,
    OwnProfileUpdateSerializer,
    PasswordChangeSerializer,
    StaffSerializer,
    StudentSerializer,
    UserRoleSerializer,
    UserSerializer,
    UserStatusSerializer,
)


@method_decorator(ensure_csrf_cookie, name="dispatch")
class CsrfView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        return Response(status=status.HTTP_204_NO_CONTENT)


# DRF only checks CSRF for already-authenticated sessions, so login opts in explicitly
# to stop another site from signing a visitor into an account of its choosing.
@method_decorator(csrf_protect, name="dispatch")
class LoginView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "login"

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = services.authenticate_user(request, **serializer.validated_data)
        login(request, user)
        record(user, "auth.login", user, f"{user.email} signed in")
        return Response(MeSerializer(user).data)


class LogoutView(APIView):
    def post(self, request):
        logout(request)
        return Response(status=status.HTTP_204_NO_CONTENT)


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(MeSerializer(request.user).data)

    def patch(self, request):
        serializer = OwnProfileUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        services.update_own_profile(request.user, **serializer.validated_data)
        user = User.objects.get(pk=request.user.pk)
        return Response(MeSerializer(user).data)


class PasswordChangeView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = PasswordChangeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = services.change_password(request.user, **serializer.validated_data)
        # Changing the password rotates the session hash; keep this session signed in.
        update_session_auth_hash(request, user)
        return Response(status=status.HTTP_204_NO_CONTENT)


def name_search(search: str, prefix: str = "") -> Q:
    return (
        Q(**{f"{prefix}email__icontains": search})
        | Q(**{f"{prefix}first_name__icontains": search})
        | Q(**{f"{prefix}last_name__icontains": search})
    )


class ProfileViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.CreateModelMixin,
    mixins.UpdateModelMixin,
    viewsets.GenericViewSet,
):
    """Accounts are deactivated rather than deleted, so there's no destroy action."""

    permission_classes = [IsAdmin]

    def perform_create(self, serializer):
        serializer.instance = self.create_service(
            actor=self.request.user, **serializer.validated_data
        )

    def perform_update(self, serializer):
        serializer.instance = self.update_service(
            serializer.instance, actor=self.request.user, **serializer.validated_data
        )


class StudentViewSet(ProfileViewSet):
    serializer_class = StudentSerializer
    create_service = staticmethod(services.create_student)
    update_service = staticmethod(services.update_student)

    def get_queryset(self):
        students = StudentProfile.objects.select_related("user", "program__department__faculty")
        if self.request.user.role == Role.DEPT_ADMIN:
            students = students.filter(
                program__department_id=staff_department_id(self.request.user)
            )

        params = self.request.query_params
        if params.get("department"):
            students = students.filter(program__department_id=params["department"])
        if params.get("program"):
            students = students.filter(program_id=params["program"])
        if params.get("level"):
            students = students.filter(level=params["level"])
        if params.get("search"):
            search = params["search"]
            students = students.filter(
                Q(matric_number__icontains=search) | name_search(search, prefix="user__")
            )
        return students

    @action(detail=False)
    def export(self, request):
        user = request.user
        scope = (
            user.staff_profile.department.name
            if user.role == Role.DEPT_ADMIN
            else "All departments"
        )
        return pdf_response("student-list.pdf", documents.student_list(self.get_queryset(), scope))


class StaffViewSet(ProfileViewSet):
    serializer_class = StaffSerializer
    create_service = staticmethod(services.create_staff)
    update_service = staticmethod(services.update_staff)

    def get_queryset(self):
        staff = StaffProfile.objects.select_related("user", "department")
        if self.request.user.role == Role.DEPT_ADMIN:
            staff = staff.filter(department_id=staff_department_id(self.request.user))

        params = self.request.query_params
        if params.get("department"):
            staff = staff.filter(department_id=params["department"])
        if params.get("role"):
            staff = staff.filter(user__role=params["role"])
        if params.get("search"):
            search = params["search"]
            staff = staff.filter(Q(staff_id__icontains=search) | name_search(search, "user__"))
        return staff


class UserViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = UserSerializer
    permission_classes = [IsSuperAdmin]

    def get_queryset(self):
        users = User.objects.order_by("email")
        params = self.request.query_params
        if params.get("role"):
            users = users.filter(role=params["role"])
        if params.get("status"):
            users = users.filter(status=params["status"])
        if params.get("search"):
            users = users.filter(name_search(params["search"]))
        return users

    @action(detail=True, methods=["post"], url_path="status")
    def set_status(self, request, pk=None):
        serializer = UserStatusSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = services.set_user_status(
            actor=request.user, user=self.get_object(), **serializer.validated_data
        )
        return Response(UserSerializer(user).data)

    @action(detail=True, methods=["post"], url_path="role")
    def set_role(self, request, pk=None):
        serializer = UserRoleSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = services.set_user_role(
            actor=request.user, user=self.get_object(), **serializer.validated_data
        )
        return Response(UserSerializer(user).data)
