from rest_framework.permissions import BasePermission


class IsDoctor(BasePermission):
    message = "Doctor account required."

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and hasattr(request.user, "doctor_profile"))
