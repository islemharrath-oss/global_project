from django.urls import path
from . import views

urlpatterns = [
    path('analyze/', views.analyze_xray, name='analyze'),
    path('history/', views.get_history, name='history'),
    path('history/<int:pk>/', views.delete_analysis, name='delete-analysis'),
]