from rest_framework import serializers

from .models import StaffProfile, StudentProfile, User


class UserSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(source="get_full_name", read_only=True)

    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "first_name",
            "last_name",
            "full_name",
            "role",
            "status",
            "last_login",
            "date_joined",
        ]
        read_only_fields = fields


class StudentProfileSerializer(serializers.ModelSerializer):
    program_name = serializers.CharField(source="program.name", read_only=True)
    department = serializers.IntegerField(source="program.department_id", read_only=True)
    department_name = serializers.CharField(source="program.department.name", read_only=True)
    faculty_name = serializers.CharField(source="program.department.faculty.name", read_only=True)

    class Meta:
        model = StudentProfile
        fields = [
            "id",
            "matric_number",
            "program",
            "program_name",
            "department",
            "department_name",
            "faculty_name",
            "level",
            "phone",
            "address",
        ]


class StaffProfileSerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(source="department.name", read_only=True)

    class Meta:
        model = StaffProfile
        fields = ["id", "staff_id", "department", "department_name", "title", "phone"]


class MeSerializer(UserSerializer):
    student_profile = StudentProfileSerializer(read_only=True)
    staff_profile = StaffProfileSerializer(read_only=True)

    class Meta(UserSerializer.Meta):
        fields = UserSerializer.Meta.fields + ["student_profile", "staff_profile"]
        read_only_fields = fields


class OwnProfileUpdateSerializer(serializers.Serializer):
    phone = serializers.CharField(max_length=20, required=False, allow_blank=True)
    address = serializers.CharField(max_length=255, required=False, allow_blank=True)


class PasswordChangeSerializer(serializers.Serializer):
    current_password = serializers.CharField(trim_whitespace=False)
    new_password = serializers.CharField(trim_whitespace=False)


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(trim_whitespace=False)


class AccountFieldsMixin(serializers.Serializer):
    """User account fields exposed flat on the profile, plus a write-only initial password."""

    user_id = serializers.IntegerField(source="user.id", read_only=True)
    email = serializers.EmailField(source="user.email")
    first_name = serializers.CharField(source="user.first_name", max_length=150)
    last_name = serializers.CharField(source="user.last_name", max_length=150)
    status = serializers.CharField(source="user.status", read_only=True)
    password = serializers.CharField(write_only=True, required=False, trim_whitespace=False)

    account_fields = ["user_id", "email", "first_name", "last_name", "status", "password"]

    def validate(self, attrs):
        if self.instance is None and not attrs.get("password"):
            raise serializers.ValidationError({"password": ["Set an initial password."]})
        if self.instance is not None:
            attrs.pop("password", None)
        return attrs


class StudentSerializer(AccountFieldsMixin, StudentProfileSerializer):
    class Meta(StudentProfileSerializer.Meta):
        fields = AccountFieldsMixin.account_fields + StudentProfileSerializer.Meta.fields


class StaffSerializer(AccountFieldsMixin, StaffProfileSerializer):
    role = serializers.ChoiceField(
        source="user.role", choices=[User.Role.LECTURER, User.Role.DEPT_ADMIN]
    )

    class Meta(StaffProfileSerializer.Meta):
        fields = AccountFieldsMixin.account_fields + ["role"] + StaffProfileSerializer.Meta.fields


class UserStatusSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=User.Status.choices)


class UserRoleSerializer(serializers.Serializer):
    role = serializers.ChoiceField(choices=[User.Role.LECTURER, User.Role.DEPT_ADMIN])
