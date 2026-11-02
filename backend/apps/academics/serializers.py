from rest_framework import serializers

from apps.accounts.models import StaffProfile

from .models import (
    AcademicSession,
    Course,
    CourseAllocation,
    Department,
    Faculty,
    Program,
    Semester,
)


class FacultySerializer(serializers.ModelSerializer):
    class Meta:
        model = Faculty
        fields = ["id", "name", "code"]


class DepartmentSerializer(serializers.ModelSerializer):
    faculty_name = serializers.CharField(source="faculty.name", read_only=True)

    class Meta:
        model = Department
        fields = ["id", "faculty", "faculty_name", "name", "code"]


class ProgramSerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(source="department.name", read_only=True)

    class Meta:
        model = Program
        fields = [
            "id",
            "department",
            "department_name",
            "name",
            "code",
            "duration_years",
            "max_level",
        ]


class SemesterSerializer(serializers.ModelSerializer):
    session_name = serializers.CharField(source="session.name", read_only=True)
    label = serializers.CharField(source="__str__", read_only=True)

    class Meta:
        model = Semester
        fields = [
            "id",
            "session",
            "session_name",
            "term",
            "label",
            "is_current",
            "registration_open",
        ]
        read_only_fields = ["is_current", "registration_open"]


class AcademicSessionSerializer(serializers.ModelSerializer):
    semesters = SemesterSerializer(many=True, read_only=True)

    class Meta:
        model = AcademicSession
        fields = ["id", "name", "start_date", "end_date", "semesters"]


class RegistrationToggleSerializer(serializers.Serializer):
    open = serializers.BooleanField()


class CourseSerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(source="department.name", read_only=True)
    program_codes = serializers.SlugRelatedField(
        source="programs", slug_field="code", many=True, read_only=True
    )

    class Meta:
        model = Course
        fields = [
            "id",
            "department",
            "department_name",
            "code",
            "title",
            "units",
            "level",
            "term",
            "programs",
            "program_codes",
            "is_active",
        ]


class CourseAllocationSerializer(serializers.ModelSerializer):
    course_detail = CourseSerializer(source="course", read_only=True)
    semester_label = serializers.CharField(source="semester.__str__", read_only=True)
    lecturer_name = serializers.CharField(source="lecturer.__str__", read_only=True)
    registered_count = serializers.IntegerField(read_only=True)
    result_sheet = serializers.IntegerField(source="result_sheet_id", read_only=True)
    result_status = serializers.CharField(read_only=True)
    semester = serializers.PrimaryKeyRelatedField(queryset=Semester.objects.all(), required=False)
    lecturer = serializers.PrimaryKeyRelatedField(
        queryset=StaffProfile.objects.select_related("user")
    )

    class Meta:
        model = CourseAllocation
        fields = [
            "id",
            "course",
            "course_detail",
            "semester",
            "semester_label",
            "lecturer",
            "lecturer_name",
            "assigned_at",
            "registered_count",
            "result_sheet",
            "result_status",
        ]
        # Reallocation is an upsert on (course, semester), handled by the service.
        validators = []
