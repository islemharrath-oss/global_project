from django.contrib.auth.models import User
from django.db import transaction
from rest_framework import serializers

from .models import DoctorProfile, PatientProfile


class DoctorProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = DoctorProfile
        fields = ["specialty", "license_number", "hospital", "phone", "created_at"]
        read_only_fields = ["created_at"]


class PatientProfileSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = PatientProfile
        fields = [
            "id",
            "full_name",
            "medical_record_number",
            "date_of_birth",
            "phone",
            "address",
            "emergency_contact",
            "doctor",
            "created_by",
            "created_at",
        ]
        read_only_fields = ["id", "created_by", "doctor", "created_at", "full_name"]

    def get_full_name(self, obj):
        return obj.full_name


class AuthUserSerializer(serializers.ModelSerializer):
    role = serializers.SerializerMethodField()
    doctor_profile = serializers.SerializerMethodField()
    patient_profile = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "first_name",
            "last_name",
            "email",
            "role",
            "doctor_profile",
            "patient_profile",
        ]

    def get_role(self, user):
        if hasattr(user, "doctor_profile"):
            return "doctor"
        if hasattr(user, "patient_profile"):
            return "patient"
        return "user"

    def get_doctor_profile(self, user):
        if hasattr(user, "doctor_profile"):
            return DoctorProfileSerializer(user.doctor_profile).data
        return None

    def get_patient_profile(self, user):
        if hasattr(user, "patient_profile"):
            return PatientProfileSerializer(user.patient_profile).data
        return None


class DoctorRegisterSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=8)
    first_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    last_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    specialty = serializers.CharField(max_length=120)
    license_number = serializers.CharField(max_length=80)
    hospital = serializers.CharField(max_length=180, required=False, allow_blank=True)
    phone = serializers.CharField(max_length=40, required=False, allow_blank=True)

    def validate_username(self, value):
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("Username already exists.")
        return value

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("Email already exists.")
        return value

    def validate_license_number(self, value):
        if DoctorProfile.objects.filter(license_number=value).exists():
            raise serializers.ValidationError("License number already exists.")
        return value

    @transaction.atomic
    def create(self, validated_data):
        password = validated_data.pop("password")
        profile_data = {
            "specialty": validated_data.pop("specialty"),
            "license_number": validated_data.pop("license_number"),
            "hospital": validated_data.pop("hospital", ""),
            "phone": validated_data.pop("phone", ""),
        }
        user = User.objects.create_user(**validated_data)
        user.set_password(password)
        user.save()
        DoctorProfile.objects.create(user=user, **profile_data)
        return user

    def save(self, **kwargs):
        return self.create({**self.validated_data, **kwargs})


class PatientCreateSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150)
    email = serializers.EmailField(required=False, allow_blank=True)
    password = serializers.CharField(write_only=True, min_length=8)
    first_name = serializers.CharField(max_length=150)
    last_name = serializers.CharField(max_length=150)
    medical_record_number = serializers.CharField(max_length=80)
    date_of_birth = serializers.DateField(required=False, allow_null=True)
    phone = serializers.CharField(max_length=40, required=False, allow_blank=True)
    address = serializers.CharField(required=False, allow_blank=True)
    emergency_contact = serializers.CharField(required=False, allow_blank=True)

    def validate_username(self, value):
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("Username already exists.")
        return value

    def validate_medical_record_number(self, value):
        if PatientProfile.objects.filter(medical_record_number=value).exists():
            raise serializers.ValidationError("Medical record number already exists.")
        return value

    @transaction.atomic
    def create(self, validated_data):
        request = self.context.get("request")
        created_by = getattr(request, "user", None)
        password = validated_data.pop("password")
        user = User.objects.create_user(
            username=validated_data.pop("username"),
            email=validated_data.pop("email", ""),
            first_name=validated_data.pop("first_name"),
            last_name=validated_data.pop("last_name"),
        )
        user.set_password(password)
        user.save()
        patient = PatientProfile.objects.create(
            user=user,
            doctor=created_by,
            created_by=created_by,
            medical_record_number=validated_data.pop("medical_record_number"),
            date_of_birth=validated_data.pop("date_of_birth", None),
            phone=validated_data.pop("phone", ""),
            address=validated_data.pop("address", ""),
            emergency_contact=validated_data.pop("emergency_contact", ""),
        )
        return patient

    def save(self, **kwargs):
        return self.create({**self.validated_data, **kwargs})
