from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.http import JsonResponse


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
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)


