from django.db import models


class CourseRegistration(models.Model):
    student = models.ForeignKey(
        "accounts.StudentProfile", on_delete=models.PROTECT, related_name="registrations"
    )
    course = models.ForeignKey(
        "academics.Course", on_delete=models.PROTECT, related_name="registrations"
    )
    semester = models.ForeignKey(
        "academics.Semester", on_delete=models.PROTECT, related_name="registrations"
    )
    registered_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["course__code"]
        constraints = [
            models.UniqueConstraint(
                fields=["student", "course", "semester"], name="no_duplicate_registration"
            ),
        ]

    def __str__(self):
        return f"{self.student} - {self.course.code} ({self.semester})"
