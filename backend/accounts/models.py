from django.contrib.auth.models import User
from django.db import models
from django.utils import timezone

# Ajouter après les imports
class UserRole(models.TextChoices):
    ADMIN   = 'admin',   'Admin'
    DOCTOR  = 'doctor',  'Doctor'
    PATIENT = 'patient', 'Patient'

class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    role = models.CharField(max_length=10, choices=UserRole.choices, default=UserRole.DOCTOR)

    def __str__(self):
        return f"{self.user.username} ({self.role})"
class DoctorProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="doctor_profile")
    specialty = models.CharField(max_length=120)
    license_number = models.CharField(max_length=80, unique=True)
    hospital = models.CharField(max_length=180, blank=True, default="")
    phone = models.CharField(max_length=40, blank=True, default="")
    created_at = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return f"Dr. {self.user.get_full_name() or self.user.username}"


class PatientProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="patient_profile")
    doctor = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name="patients")
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name="created_patients")
    medical_record_number = models.CharField(max_length=80, unique=True)
    date_of_birth = models.DateField(null=True, blank=True)
    phone = models.CharField(max_length=40, blank=True, default="")
    address = models.TextField(blank=True, default="")
    emergency_contact = models.CharField(max_length=120, blank=True, default="")
    created_at = models.DateTimeField(default=timezone.now)

    @property
    def full_name(self):
        return self.user.get_full_name() or self.user.username

    def __str__(self):
        return f"{self.full_name} ({self.medical_record_number})"
