from django.urls import path
from . import views
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

urlpatterns = [
    path('', views.api_root, name='api-root'),
    path('auth/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('auth/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('auth/register/doctor/', views.register_doctor, name='register-doctor'),
    path('auth/doctors/', views.list_doctors, name='list-doctors'),
    path('auth/patients/', views.create_patient, name='create-patient'),
    path('auth/me/', views.me, name='me'),
    path('analyze/', views.analyze_xray, name='analyze'),
    path('history/', views.get_history, name='history'),
    path('history/<int:pk>/', views.delete_analysis, name='delete-analysis'),
]