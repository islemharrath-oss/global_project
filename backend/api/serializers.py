
from rest_framework import serializers
from .models import XRayAnalysis


class XRayAnalysisSerializer(serializers.ModelSerializer):
    """
    Serializer for XRayAnalysis model.
    
    Includes computed fields for image URLs and handles nested data structures.
    Used for both list and detail views of analyses.
    """
    
    image_url = serializers.SerializerMethodField()
    xai_url = serializers.SerializerMethodField()

    class Meta:
        model = XRayAnalysis
        fields = [
            'id',
            'date',
            'findings',
            'impression',
            'pathologies',
            'recommendations',
            'confidence_score',
            'image_url',
            'xai_url'
        ]
        read_only_fields = [
            'id',
            'date',
            'image_url',
            'xai_url'
        ]

    def get_image_url(self, obj):
        """
        Generate absolute URL for the X-ray image.
        
        Args:
            obj: XRayAnalysis instance
            
        Returns:
            str: Absolute URL to the image file, or None if no image
        """
        request = self.context.get('request')
        if obj.image and request:
            return request.build_absolute_uri(obj.image.url)
        return None

    def get_xai_url(self, obj):
        """
        Generate absolute URL for the XAI heatmap image.
        
        Args:
            obj: XRayAnalysis instance
            
        Returns:
            str: Absolute URL to the XAI image file, or None if no image
        """
        request = self.context.get('request')
        if obj.xai_image and request:
            return request.build_absolute_uri(obj.xai_image.url)
        return None

    def validate_pathologies(self, value):
        """
        Validate that pathologies is a non-empty list of strings.
        
        Args:
            value: The pathologies list
            
        Returns:
            list: Validated pathologies list
            
        Raises:
            ValidationError: If pathologies is invalid
        """
        if not isinstance(value, list):
            raise serializers.ValidationError("Pathologies must be a list.")
        
        for item in value:
            if not isinstance(item, str) or not item.strip():
                raise serializers.ValidationError("Each pathology must be a non-empty string.")
        
        return value

    def validate_confidence_score(self, value):
        """
        Validate confidence score is between 0-100.
        
        Args:
            value: The confidence score value
            
        Returns:
            float: Validated confidence score
            
        Raises:
            ValidationError: If confidence_score is out of range
        """
        if not (0 <= value <= 100):
            raise serializers.ValidationError("Confidence score must be between 0 and 100.")
        return value
