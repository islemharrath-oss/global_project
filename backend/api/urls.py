from django.urls import path
from . import views
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

urlpatterns = [
    # Root
    path('', views.api_root, name='api-root'),

    # Auth JWT
    path('auth/token/',         TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('auth/token/refresh/', TokenRefreshView.as_view(),    name='token_refresh'),

    # Doctor / Users
    path('auth/register/doctor/', views.register_doctor, name='register-doctor'),
    path('auth/register/admin/',  views.register_admin,  name='register-admin'),
    path('auth/doctors/',         views.list_doctors,     name='list-doctors'),
    path('auth/patients/',        views.patients_view,    name='patients'),
    path('auth/me/',              views.me,               name='me'),

    # Admin endpoints
    path('admin/doctors/',                             views.admin_list_doctors,   name='admin-doctors'),
    path('admin/doctors/create/',                      views.admin_create_doctor,  name='admin-create-doctor'),
    path('admin/doctors/<int:doctor_id>/update/',      views.admin_update_doctor,  name='admin-update-doctor'),
    path('admin/patients/create/',                     views.admin_create_patient, name='admin-create-patient'),
    path('admin/patients/<int:patient_id>/update/',    views.admin_update_patient, name='admin-update-patient'),
    path('admin/patients/<int:patient_id>/assign/',    views.admin_assign_patient, name='admin-assign-patient'),
    path('admin/users/<int:user_id>/delete/',          views.admin_delete_user,    name='admin-delete-user'),

    # Patient portal
    path('patient/analyze/', views.patient_analyze, name='patient-analyze'),

    # AI analysis
    path('analyze/', views.analyze_xray, name='analyze'),

    # History
    path('history/',          views.get_history,      name='history'),
    path('history/<int:pk>/', views.delete_analysis,  name='delete-analysis'),
]