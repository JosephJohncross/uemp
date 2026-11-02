from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from .models import StaffProfile, StudentProfile, User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    ordering = ["email"]
    list_display = ["email", "first_name", "last_name", "role", "status"]
    list_filter = ["role", "status"]
    search_fields = ["email", "first_name", "last_name"]
    fieldsets = [
        (None, {"fields": ["email", "password"]}),
        ("Personal", {"fields": ["first_name", "last_name"]}),
        ("Access", {"fields": ["role", "status", "is_staff", "is_superuser"]}),
    ]
    add_fieldsets = [
        (None, {"fields": ["email", "first_name", "last_name", "role", "password1", "password2"]}),
    ]


admin.site.register(StudentProfile)
admin.site.register(StaffProfile)
