import os
import logging
from django.core.exceptions import ValidationError
from rest_framework.decorators import api_view, parser_classes
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response
from rest_framework import status
from .models import XRayAnalysis
from .serializers import XRayAnalysisSerializer

logger = logging.getLogger(__name__)

# Maximum file size: 10MB
MAX_FILE_SIZE = 10 * 1024 * 1024
ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif']


def validate_image_file(image):
    """Validate uploaded image file."""
    if not image:
        raise ValidationError('Aucune image fournie')
    
    # Check file size
    if image.size > MAX_FILE_SIZE:
        raise ValidationError(f'Fichier trop volumineux. Maximum: {MAX_FILE_SIZE / (1024*1024):.0f}MB')
    
    # Check file extension
    ext = image.name.split('.')[-1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise ValidationError(f'Format non supporté. Extensions autorisées: {", ".join(ALLOWED_EXTENSIONS)}')
    
    return True


@api_view(['POST'])
@parser_classes([MultiPartParser, FormParser])
def analyze_xray(request):
    """
    Analyze an X-ray image and return diagnostic report.
    
    Expected form data:
    - image: ImageField (required)
    
    Returns:
    - id: Analysis ID
    - findings, impression, pathologies, recommendations: Analysis results
    - confidence_score: Model confidence (0-100)
    - image_url: URL to uploaded image
    - date: Analysis timestamp
    """
    try:
        image = request.FILES.get('image')
        
        # Validate image
        validate_image_file(image)
        
        # Save to database
        analysis = XRayAnalysis.objects.create(image=image)
        logger.info(f'New analysis created: {analysis.id}')
        
        # === Integration point for MedGemma ===
        # from .medgemma import run_medgemma
        # result = run_medgemma(analysis.image.path)
        # Uncomment and implement MedGemma integration above
        
        # Mock results for demonstration
        analysis.findings = 'Opacités bilatérales en verre dépoli dans les lobes inférieurs.'
        analysis.impression = 'Compatible avec une pneumonie virale bilatérale.'
        analysis.pathologies = ['Pneumonie', 'Infiltrats bilatéraux']
        analysis.recommendations = 'Suivi clinique recommandé dans 48h. Scanner thoracique si aggravation.'
        analysis.confidence_score = 87.5
        analysis.raw_report = f"{analysis.findings}\n\n{analysis.impression}"
        analysis.save()
        
        return Response({
            'id': analysis.id,
            'findings': analysis.findings,
            'impression': analysis.impression,
            'pathologies': analysis.pathologies,
            'recommendations': analysis.recommendations,
            'confidence_score': analysis.confidence_score,
            'raw_report': analysis.raw_report,
            'xai_image': None,
            'xai_method': 'Grad-CAM',
            'image_url': request.build_absolute_uri(analysis.image.url),
            'date': analysis.date,
        }, status=status.HTTP_201_CREATED)
    
    except ValidationError as e:
        logger.warning(f'Validation error: {str(e)}')
        return Response(
            {'error': str(e)},
            status=status.HTTP_400_BAD_REQUEST
        )
    except Exception as e:
        logger.error(f'Unexpected error during analysis: {str(e)}', exc_info=True)
        return Response(
            {'error': 'Erreur serveur. Veuillez réessayer plus tard.'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
def get_history(request):
    """
    Retrieve all X-ray analyses from history.
    
    Query parameters:
    - limit: Maximum number of results (default: all)
    - offset: Pagination offset (default: 0)
    
    Returns:
    - results: List of analysis objects
    """
    try:
        analyses = XRayAnalysis.objects.all()
        
        # Optional pagination
        limit = request.query_params.get('limit')
        offset = request.query_params.get('offset', 0)
        
        if limit:
            try:
                limit = int(limit)
                offset = int(offset)
                analyses = analyses[offset:offset + limit]
            except (ValueError, TypeError) as e:
                logger.warning(f'Invalid pagination params: {str(e)}')
        
        serializer = XRayAnalysisSerializer(
            analyses, many=True, context={'request': request}
        )
        return Response({'results': serializer.data})
    
    except Exception as e:
        logger.error(f'Error retrieving history: {str(e)}', exc_info=True)
        return Response(
            {'error': 'Erreur lors de la récupération de l\'historique'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['DELETE'])
def delete_analysis(request, pk):
    """
    Delete an X-ray analysis by ID.
    
    Parameters:
    - pk: Analysis ID to delete
    
    Returns:
    - 204 No Content on success
    - 404 Not Found if analysis doesn't exist
    """
    try:
        analysis = XRayAnalysis.objects.get(pk=pk)
        
        # Delete associated files
        if analysis.image and os.path.isfile(analysis.image.path):
            try:
                os.remove(analysis.image.path)
                logger.info(f'Deleted image file: {analysis.image.path}')
            except OSError as e:
                logger.warning(f'Could not delete image file: {str(e)}')
        
        if analysis.xai_image and os.path.isfile(analysis.xai_image.path):
            try:
                os.remove(analysis.xai_image.path)
                logger.info(f'Deleted XAI file: {analysis.xai_image.path}')
            except OSError as e:
                logger.warning(f'Could not delete XAI file: {str(e)}')
        
        analysis.delete()
        logger.info(f'Analysis deleted: {pk}')
        return Response(status=status.HTTP_204_NO_CONTENT)
    
    except XRayAnalysis.DoesNotExist:
        logger.warning(f'Analysis not found: {pk}')
        return Response(
            {'error': 'Analyse non trouvée'},
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        logger.error(f'Error deleting analysis {pk}: {str(e)}', exc_info=True)
        return Response(
            {'error': 'Erreur lors de la suppression'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
