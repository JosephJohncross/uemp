from rest_framework import viewsets

from apps.core.permissions import IsSuperAdmin

from .models import AuditLog
from .serializers import AuditLogSerializer


class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = AuditLogSerializer
    permission_classes = [IsSuperAdmin]

    def get_queryset(self):
        entries = AuditLog.objects.select_related("actor")
        params = self.request.query_params
        if params.get("action"):
            entries = entries.filter(action__startswith=params["action"])
        if params.get("actor"):
            entries = entries.filter(actor_id=params["actor"])
        if params.get("search"):
            entries = entries.filter(summary__icontains=params["search"])
        return entries
