from django.conf import settings
from django.contrib import admin
from django.urls import path

from apps.core.views import health

urlpatterns = [
    path("api/health/", health),
]

if settings.DEBUG:
    urlpatterns.append(path("django-admin/", admin.site.urls))
