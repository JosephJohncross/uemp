from rest_framework import serializers

from apps.academics.models import Course

from .models import CourseRegistration


class CourseSummarySerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(source="department.name", read_only=True)

    class Meta:
        model = Course
        fields = ["id", "code", "title", "units", "level", "term", "department_name"]


class AvailableCourseSerializer(CourseSummarySerializer):
    registered = serializers.SerializerMethodField()

    class Meta(CourseSummarySerializer.Meta):
        fields = CourseSummarySerializer.Meta.fields + ["registered"]

    def get_registered(self, course) -> bool:
        return course.pk in self.context["registered_ids"]


class CourseRegistrationSerializer(serializers.ModelSerializer):
    course = CourseSummarySerializer(read_only=True)
    semester_label = serializers.CharField(source="semester.__str__", read_only=True)
    matric_number = serializers.CharField(source="student.matric_number", read_only=True)
    student_name = serializers.CharField(source="student.user.get_full_name", read_only=True)
    student_level = serializers.IntegerField(source="student.level", read_only=True)
    program_name = serializers.CharField(source="student.program.name", read_only=True)

    class Meta:
        model = CourseRegistration
        fields = [
            "id",
            "student",
            "matric_number",
            "student_name",
            "student_level",
            "program_name",
            "course",
            "semester",
            "semester_label",
            "registered_at",
        ]


class RegisterCoursesSerializer(serializers.Serializer):
    course_ids = serializers.ListField(
        child=serializers.IntegerField(min_value=1), allow_empty=False, max_length=20
    )
