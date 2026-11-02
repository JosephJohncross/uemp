from django.conf import settings
from django.db import models
from django.db.models import Q


class ResultSheet(models.Model):
    class Status(models.TextChoices):
        DRAFT = "DRAFT", "Draft"
        SUBMITTED = "SUBMITTED", "Submitted"
        APPROVED = "APPROVED", "Approved"
        RETURNED = "RETURNED", "Returned for correction"

    course = models.ForeignKey(
        "academics.Course", on_delete=models.PROTECT, related_name="result_sheets"
    )
    semester = models.ForeignKey(
        "academics.Semester", on_delete=models.PROTECT, related_name="result_sheets"
    )
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.DRAFT)
    submitted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="submitted_sheets",
    )
    submitted_at = models.DateTimeField(null=True, blank=True)
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="reviewed_sheets",
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    review_comment = models.TextField(blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["course", "semester"], name="one_result_sheet_per_course_per_semester"
            ),
        ]

    def __str__(self):
        return f"{self.course.code} ({self.semester}) - {self.get_status_display()}"

    @property
    def is_editable(self) -> bool:
        return self.status in (self.Status.DRAFT, self.Status.RETURNED)


class Score(models.Model):
    sheet = models.ForeignKey(ResultSheet, on_delete=models.CASCADE, related_name="scores")
    registration = models.OneToOneField(
        "registration.CourseRegistration", on_delete=models.PROTECT, related_name="score"
    )
    # Left empty while a lecturer is part-way through entering a draft;
    # submission requires both.
    ca_score = models.PositiveSmallIntegerField(null=True, blank=True)
    exam_score = models.PositiveSmallIntegerField(null=True, blank=True)
    total = models.PositiveSmallIntegerField(null=True, blank=True)
    grade = models.CharField(max_length=2, blank=True)
    grade_point = models.PositiveSmallIntegerField(null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["registration__student__matric_number"]
        constraints = [
            models.CheckConstraint(
                condition=Q(ca_score__lte=settings.CA_MAX_SCORE), name="ca_score_within_max"
            ),
            models.CheckConstraint(
                condition=Q(exam_score__lte=settings.EXAM_MAX_SCORE),
                name="exam_score_within_max",
            ),
        ]

    def __str__(self):
        return f"{self.registration} - {self.grade or 'ungraded'}"
