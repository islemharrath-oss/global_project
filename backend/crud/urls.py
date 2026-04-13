from django.contrib import admin
from django.urls import path, include, re_path
from django.conf import settings
from django.http import JsonResponse
from django.views.static import serve


def root_status(_request):
    return JsonResponse(
        {
            "status": "ok",
            "service": "medvision-backend",
            "endpoints": {
                "api": "/api/",
                "history": "/api/history/",
                "analyze": "/api/analyze/",
                "admin": "/admin/",
            },
        }
    )

urlpatterns = [
    path('', root_status, name='root-status'),
    path('admin/', admin.site.urls),
    path('api/', include('api.urls')),
    re_path(r'^media/(?P<path>.*)$', serve, {'document_root': settings.MEDIA_ROOT}),
    re_path(r'^static/(?P<path>.*)$', serve, {'document_root': settings.STATIC_ROOT}),
]


