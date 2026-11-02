from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models

from apps.academics.models import Level


class UserManager(BaseUserManager):
    use_in_migrations = True

    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError("Email is required.")
        user = self.model(email=self.normalize_email(email), **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault("role", User.Role.SUPER_ADMIN)
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        return self.create_user(email, password, **extra_fields)


class User(AbstractUser):
    class Role(models.TextChoices):
        STUDENT = "STUDENT", "Student"
        LECTURER = "LECTURER", "Lecturer"
        DEPT_ADMIN = "DEPT_ADMIN", "Department Admin"
        SUPER_ADMIN = "SUPER_ADMIN", "Super Admin"

    class Status(models.TextChoices):
        ACTIVE = "ACTIVE", "Active"
        SUSPENDED = "SUSPENDED", "Suspended"
        DEACTIVATED = "DEACTIVATED", "Deactivated"

    username = None
    email = models.EmailField(unique=True)
    role = models.CharField(max_length=20, choices=Role.choices)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["first_name", "last_name"]

    objects = UserManager()

    def save(self, *args, **kwargs):
        self.is_active = self.status == self.Status.ACTIVE
        super().save(*args, **kwargs)

    def __str__(self):
        return self.email


class StudentProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="student_profile")
    matric_number = models.CharField(max_length=30, unique=True)
    program = models.ForeignKey(
        "academics.Program", on_delete=models.PROTECT, related_name="students"
    )
    level = models.PositiveSmallIntegerField(choices=Level.choices)
    phone = models.CharField(max_length=20, blank=True)
    address = models.CharField(max_length=255, blank=True)

    class Meta:
        ordering = ["matric_number"]

    def __str__(self):
        return self.matric_number

    @property
    def department(self):
        return self.program.department


class StaffProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="staff_profile")
    staff_id = models.CharField(max_length=30, unique=True)
    department = models.ForeignKey(
        "academics.Department", on_delete=models.PROTECT, related_name="staff"
    )
    title = models.CharField(max_length=30, blank=True, help_text="e.g. Dr., Prof.")
    phone = models.CharField(max_length=20, blank=True)

    class Meta:
        ordering = ["staff_id"]

    def __str__(self):
        name = self.user.get_full_name()
        return f"{self.title} {name}".strip()
