from django.contrib import admin

from .models import DoctorProfile, PatientProfile


@admin.register(DoctorProfile)
class DoctorProfileAdmin(admin.ModelAdmin):
    list_display = ("user", "specialty", "license_number", "hospital", "created_at")
    search_fields = ("user__username", "user__first_name", "user__last_name", "license_number", "specialty")


@admin.register(PatientProfile)
class PatientProfileAdmin(admin.ModelAdmin):
    list_display = ("user", "medical_record_number", "doctor", "created_at")
    search_fields = ("user__username", "user__first_name", "user__last_name", "medical_record_number")
    list_filter = ("doctor",)
