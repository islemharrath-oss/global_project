from django.contrib import admin
from .models import XRayAnalysis

@admin.register(XRayAnalysis)
class XRayAnalysisAdmin(admin.ModelAdmin):
    list_display = ['id', 'date', 'confidence_score', 'impression_courte']
    readonly_fields = ['date', 'image_preview', 'xai_preview']
    list_filter = ['date']
    search_fields = ['findings', 'impression', 'pathologies']
    list_per_page = 20

    fieldsets = (
        ('Image', {
            'fields': ('image', 'image_preview', 'xai_image', 'xai_preview')
        }),
        ('Rapport Médical', {
            'fields': ('findings', 'impression', 'pathologies', 'recommendations', 'raw_report')
        }),
        ('Métadonnées', {
            'fields': ('date', 'confidence_score')
        }),
    )

    def impression_courte(self, obj):
        if obj.impression:
            return obj.impression[:80] + '...' if len(obj.impression) > 80 else obj.impression
        return '-'
    impression_courte.short_description = 'Impression'

    def image_preview(self, obj):
        if obj.image:
            from django.utils.html import format_html
            return format_html(
                '<img src="{}" style="max-width:300px; max-height:300px; '
                'border-radius:8px;" />',
                obj.image.url
            )
        return 'Aucune image'
    image_preview.short_description = 'Aperçu Radiographie'

    def xai_preview(self, obj):
        if obj.xai_image:
            from django.utils.html import format_html
            return format_html(
                '<img src="{}" style="max-width:300px; max-height:300px; '
                'border-radius:8px;" />',
                obj.xai_image.url
            )
        return 'Aucune heatmap'
    xai_preview.short_description = 'Aperçu Heatmap XAI'