from django.db import models
from django.db.models import Q


class Term(models.TextChoices):
    FIRST = "FIRST", "First Semester"
    SECOND = "SECOND", "Second Semester"


class Level(models.IntegerChoices):
    L100 = 100, "100 Level"
    L200 = 200, "200 Level"
    L300 = 300, "300 Level"
    L400 = 400, "400 Level"
    L500 = 500, "500 Level"


class Faculty(models.Model):
    name = models.CharField(max_length=150, unique=True)
    code = models.CharField(max_length=10, unique=True)

    class Meta:
        ordering = ["name"]
        verbose_name_plural = "faculties"

    def __str__(self):
        return self.name


class Department(models.Model):
    faculty = models.ForeignKey(Faculty, on_delete=models.PROTECT, related_name="departments")
    name = models.CharField(max_length=150, unique=True)
    code = models.CharField(max_length=10, unique=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class Program(models.Model):
    department = models.ForeignKey(Department, on_delete=models.PROTECT, related_name="programs")
    name = models.CharField(max_length=150, unique=True)
    code = models.CharField(max_length=20, unique=True)
    duration_years = models.PositiveSmallIntegerField(default=4)

    class Meta:
        ordering = ["name"]
        constraints = [
            models.CheckConstraint(
                condition=Q(duration_years__gte=1, duration_years__lte=6),
                name="program_duration_between_1_and_6",
            ),
        ]

    def __str__(self):
        return self.name

    @property
    def max_level(self) -> int:
        return self.duration_years * 100


class AcademicSession(models.Model):
    name = models.CharField(max_length=20, unique=True, help_text="e.g. 2025/2026")
    start_date = models.DateField()
    end_date = models.DateField()

    class Meta:
        ordering = ["-start_date"]
        constraints = [
            models.CheckConstraint(
                condition=Q(end_date__gt=models.F("start_date")),
                name="session_ends_after_it_starts",
            ),
        ]

    def __str__(self):
        return self.name


class Semester(models.Model):
    session = models.ForeignKey(AcademicSession, on_delete=models.PROTECT, related_name="semesters")
    term = models.CharField(max_length=10, choices=Term.choices)
    is_current = models.BooleanField(default=False)
    registration_open = models.BooleanField(default=False)

    class Meta:
        ordering = ["-session__start_date", "term"]
        constraints = [
            models.UniqueConstraint(fields=["session", "term"], name="unique_term_per_session"),
            models.UniqueConstraint(
                fields=["is_current"],
                condition=Q(is_current=True),
                name="single_current_semester",
            ),
        ]

    def __str__(self):
        return f"{self.session.name} {self.get_term_display()}"


class Course(models.Model):
    department = models.ForeignKey(Department, on_delete=models.PROTECT, related_name="courses")
    code = models.CharField(max_length=10, unique=True)
    title = models.CharField(max_length=200)
    units = models.PositiveSmallIntegerField()
    level = models.PositiveSmallIntegerField(choices=Level.choices)
    term = models.CharField(max_length=10, choices=Term.choices)
    programs = models.ManyToManyField(Program, related_name="courses")
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["code"]
        constraints = [
            models.CheckConstraint(
                condition=Q(units__gte=1, units__lte=6), name="course_units_between_1_and_6"
            ),
        ]

    def __str__(self):
        return f"{self.code} - {self.title}"


class CourseAllocation(models.Model):
    course = models.ForeignKey(Course, on_delete=models.PROTECT, related_name="allocations")
    semester = models.ForeignKey(Semester, on_delete=models.PROTECT, related_name="allocations")
    lecturer = models.ForeignKey(
        "accounts.StaffProfile", on_delete=models.PROTECT, related_name="allocations"
    )
    assigned_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["course", "semester"], name="one_lecturer_per_course_per_semester"
            ),
        ]

    def __str__(self):
        return f"{self.course.code} ({self.semester}) - {self.lecturer}"
