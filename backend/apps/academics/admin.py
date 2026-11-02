from django.contrib import admin

from .models import (
    AcademicSession,
    Course,
    CourseAllocation,
    Department,
    Faculty,
    Program,
    Semester,
)

admin.site.register([Faculty, Department, Program, AcademicSession, Semester, CourseAllocation])


@admin.register(Course)
class CourseAdmin(admin.ModelAdmin):
    list_display = ["code", "title", "units", "level", "term", "department"]
    list_filter = ["department", "level", "term"]
    filter_horizontal = ["programs"]
