from django.db.models import ProtectedError
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import exception_handler


def api_exception_handler(exc, context):
    if isinstance(exc, ProtectedError):
        return Response(
            {"detail": "This record is referenced by other records and can't be deleted."},
            status=status.HTTP_409_CONFLICT,
        )
    return exception_handler(exc, context)
