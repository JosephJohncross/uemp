from django.contrib import admin

from .models import ResultSheet, Score

admin.site.register([ResultSheet, Score])
