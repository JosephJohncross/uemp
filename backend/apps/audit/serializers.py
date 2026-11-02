from rest_framework import serializers

from .models import AuditLog


class AuditLogSerializer(serializers.ModelSerializer):
    actor_email = serializers.CharField(source="actor.email", read_only=True, default=None)
    actor_name = serializers.CharField(source="actor.get_full_name", read_only=True, default=None)
    actor_role = serializers.CharField(source="actor.role", read_only=True, default=None)

    class Meta:
        model = AuditLog
        fields = [
            "id",
            "actor",
            "actor_email",
            "actor_name",
            "actor_role",
            "action",
            "target_type",
            "target_id",
            "summary",
            "details",
            "created_at",
        ]
