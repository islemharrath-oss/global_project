from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils.translation import gettext_lazy as _


class XRayAnalysis(models.Model):
    """
    Represents a single X-ray image analysis with findings, impression, and recommendations.
    
    This model stores all medical analysis data including:
    - Original X-ray image
    - AI-generated findings and impressions
    - Detected pathologies
    - Clinical recommendations
    - Confidence scores
    - XAI visualization (heatmaps)
    
    Attributes:
        image: Original uploaded X-ray image
        date: Timestamp of analysis creation
        findings: Detailed radiological findings
        impression: Clinical impression summary
        pathologies: List of detected pathological conditions
        recommendations: Clinical recommendations (next steps)
        confidence_score: AI model confidence (0-100)
        xai_image: Grad-CAM heatmap visualization
        raw_report: Complete analysis report text
    """
    
    image = models.ImageField(
        upload_to='xrays/',
        help_text=_('Original X-ray image file')
    )
    date = models.DateTimeField(
        auto_now_add=True,
        help_text=_('Analysis creation timestamp')
    )
    findings = models.TextField(
        blank=True,
        default='',
        help_text=_('Detailed radiological findings from AI analysis')
    )
    impression = models.TextField(
        blank=True,
        default='',
        help_text=_('Clinical impression summary')
    )
    pathologies = models.JSONField(
        default=list,
        help_text=_('List of detected pathological conditions')
    )
    recommendations = models.TextField(
        blank=True,
        default='',
        help_text=_('Clinical recommendations and follow-up')
    )
    confidence_score = models.FloatField(
        default=0,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        help_text=_('AI model confidence score (0-100)')
    )
    xai_image = models.ImageField(
        upload_to='xai/',
        blank=True,
        null=True,
        help_text=_('Explainable AI visualization (Grad-CAM heatmap)')
    )
    raw_report = models.TextField(
        blank=True,
        default='',
        help_text=_('Raw report data from AI model')
    )

    def __str__(self):
        """Return a formatted string representation of the analysis."""
        return f"Analyse {self.id} - {self.date.strftime('%d/%m/%Y %H:%M')}"

    def clean(self):
        """Validate model fields."""
        from django.core.exceptions import ValidationError
        
        errors = {}
        
        # Validate confidence score
        if self.confidence_score < 0 or self.confidence_score > 100:
            errors['confidence_score'] = _('Score must be between 0 and 100')
        
        # Validate pathologies list
        if not isinstance(self.pathologies, list):
            errors['pathologies'] = _('Pathologies must be a list')
        
        if errors:
            raise ValidationError(errors)

    class Meta:
        ordering = ['-date']
        verbose_name = _("Analyse X-Ray")
        verbose_name_plural = _("Analyses X-Ray")
        indexes = [
            models.Index(fields=['-date']),
        ]
        permissions = [
            ("view_all_analyses", "Can view all analyses"),
            ("export_analysis", "Can export analysis"),
        ]
