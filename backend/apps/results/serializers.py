from django.conf import settings
from rest_framework import serializers

from apps.registration.serializers import CourseSummarySerializer

from .models import ResultSheet


class ResultSheetSerializer(serializers.ModelSerializer):
    course = CourseSummarySerializer(read_only=True)
    department = serializers.IntegerField(source="course.department_id", read_only=True)
    semester_label = serializers.CharField(source="semester.__str__", read_only=True)
    lecturer_name = serializers.CharField(read_only=True)
    registered_count = serializers.IntegerField(read_only=True)
    submitted_by_name = serializers.CharField(
        source="submitted_by.get_full_name", read_only=True, default=None
    )
    reviewed_by_name = serializers.CharField(
        source="reviewed_by.get_full_name", read_only=True, default=None
    )

    class Meta:
        model = ResultSheet
        fields = [
            "id",
            "course",
            "department",
            "semester",
            "semester_label",
            "status",
            "lecturer_name",
            "registered_count",
            "submitted_by_name",
            "submitted_at",
            "reviewed_by_name",
            "reviewed_at",
            "review_comment",
            "updated_at",
        ]


class ScoreRowSerializer(serializers.Serializer):
    """One line of a class list: the registration plus its score, if any."""

    registration = serializers.IntegerField(source="pk")
    matric_number = serializers.CharField(source="student.matric_number")
    student_name = serializers.CharField(source="student.user.get_full_name")
    level = serializers.IntegerField(source="student.level")
    program_name = serializers.CharField(source="student.program.name")
    ca_score = serializers.IntegerField(source="score.ca_score", default=None)
    exam_score = serializers.IntegerField(source="score.exam_score", default=None)
    total = serializers.IntegerField(source="score.total", default=None)
    grade = serializers.CharField(source="score.grade", default="")
    grade_point = serializers.IntegerField(source="score.grade_point", default=None)


class ScoreEntrySerializer(serializers.Serializer):
    registration = serializers.IntegerField()
    ca_score = serializers.IntegerField(
        min_value=0, max_value=settings.CA_MAX_SCORE, allow_null=True
    )
    exam_score = serializers.IntegerField(
        min_value=0, max_value=settings.EXAM_MAX_SCORE, allow_null=True
    )


class SaveScoresSerializer(serializers.Serializer):
    scores = ScoreEntrySerializer(many=True, allow_empty=False)


class ReviewSerializer(serializers.Serializer):
    comment = serializers.CharField(required=False, allow_blank=True, default="")


class StudentScoreSerializer(serializers.Serializer):
    course = CourseSummarySerializer(source="registration.course")
    ca_score = serializers.IntegerField()
    exam_score = serializers.IntegerField()
    total = serializers.IntegerField()
    grade = serializers.CharField()
    grade_point = serializers.IntegerField()


class SemesterResultSerializer(serializers.Serializer):
    semester = serializers.IntegerField(source="semester.pk")
    semester_label = serializers.CharField(source="semester.__str__")
    scores = StudentScoreSerializer(many=True)
    total_units = serializers.IntegerField()
    gpa = serializers.DecimalField(max_digits=3, decimal_places=2)


class StudentResultsSerializer(serializers.Serializer):
    semesters = SemesterResultSerializer(many=True)
    total_units = serializers.IntegerField()
    cgpa = serializers.DecimalField(max_digits=3, decimal_places=2)
