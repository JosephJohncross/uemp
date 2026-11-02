from django.conf import settings
from django.contrib import admin
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from apps.academics import views as academics
from apps.accounts import views as accounts
from apps.audit.views import AuditLogViewSet
from apps.core.views import health
from apps.registration import views as registration
from apps.reports import views as reports
from apps.results import views as results

router = DefaultRouter()
router.register("students", accounts.StudentViewSet, basename="student")
router.register("staff", accounts.StaffViewSet, basename="staff")
router.register("users", accounts.UserViewSet, basename="user")
router.register("faculties", academics.FacultyViewSet, basename="faculty")
router.register("departments", academics.DepartmentViewSet, basename="department")
router.register("programs", academics.ProgramViewSet, basename="program")
router.register("sessions", academics.AcademicSessionViewSet, basename="session")
router.register("semesters", academics.SemesterViewSet, basename="semester")
router.register("courses", academics.CourseViewSet, basename="course")
router.register("allocations", academics.CourseAllocationViewSet, basename="allocation")
router.register("registrations", registration.CourseRegistrationViewSet, basename="registration")
router.register("audit-logs", AuditLogViewSet, basename="audit-log")
router.register("result-sheets", results.ResultSheetViewSet, basename="result-sheet")
router.register(
    "student/registration", registration.StudentRegistrationViewSet, basename="student-registration"
)

auth_urls = [
    path("csrf/", accounts.CsrfView.as_view()),
    path("login/", accounts.LoginView.as_view()),
    path("logout/", accounts.LogoutView.as_view()),
    path("me/", accounts.MeView.as_view()),
]

urlpatterns = [
    path("api/health/", health),
    path("api/auth/", include(auth_urls)),
    path("api/student/results/", results.StudentResultsView.as_view()),
    path("api/reports/overview/", reports.OverviewReportView.as_view()),
    path("api/reports/courses/", reports.CourseReportView.as_view()),
    path("api/", include(router.urls)),
]

if settings.DEBUG:
    urlpatterns.append(path("django-admin/", admin.site.urls))
