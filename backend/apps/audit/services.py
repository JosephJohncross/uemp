from django.db import models

from .models import AuditLog


def record(actor, action: str, target: models.Model, summary: str, **details) -> AuditLog:
    return AuditLog.objects.create(
        actor=actor,
        action=action,
        target_type=target._meta.model_name,
        target_id=str(target.pk),
        summary=summary,
        details=details,
    )
