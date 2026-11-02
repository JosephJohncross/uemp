from django.conf import settings
from django.contrib import admin
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from apps.accounts import views as accounts
from apps.core.views import health

router = DefaultRouter()
router.register("students", accounts.StudentViewSet, basename="student")
router.register("staff", accounts.StaffViewSet, basename="staff")
router.register("users", accounts.UserViewSet, basename="user")

auth_urls = [
    path("csrf/", accounts.CsrfView.as_view()),
    path("login/", accounts.LoginView.as_view()),
    path("logout/", accounts.LogoutView.as_view()),
    path("me/", accounts.MeView.as_view()),
]

urlpatterns = [
    path("api/health/", health),
    path("api/auth/", include(auth_urls)),
    path("api/", include(router.urls)),
]

if settings.DEBUG:
    urlpatterns.append(path("django-admin/", admin.site.urls))
