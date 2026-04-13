import os
import json
import base64
import logging
import requests
from django.core.exceptions import ValidationError
from django.core.files.base import ContentFile
from django.conf import settings
from django.contrib.auth.models import User
from rest_framework.decorators import api_view, parser_classes, permission_classes
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny
from .models import XRayAnalysis
from .serializers import XRayAnalysisSerializer
from accounts.models import DoctorProfile, PatientProfile
from accounts.serializers import AuthUserSerializer, DoctorRegisterSerializer, PatientCreateSerializer, PatientProfileSerializer
from rest_framework_simplejwt.tokens import RefreshToken

logger = logging.getLogger(__name__)

# Maximum file size: 10MB
MAX_FILE_SIZE = 10 * 1024 * 1024
ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif']


def call_ai_service(image, patient_context=''):
    """Call external multi-agent AI service and return normalized response."""
    ai_url = f"{settings.AI_SERVICE_URL.rstrip('/')}/analyze"

    files = {
        'image': (image.name, image.read(), image.content_type or 'application/octet-stream')
    }
    data = {'patient_context': patient_context or ''}

    response = requests.post(
        ai_url,
        files=files,
        data=data,
        timeout=settings.AI_SERVICE_TIMEOUT,
    )
    response.raise_for_status()
    return response.json()


def apply_mock_analysis(analysis):
    """Fallback mock analysis when AI service is unavailable."""
    analysis.findings = 'Opacites bilaterales en verre depoli dans les lobes inferieurs.'
    analysis.impression = 'Compatible avec une pneumonie virale bilaterale.'
    analysis.pathologies = ['Pneumonie', 'Infiltrats bilateraux']
    analysis.recommendations = 'Suivi clinique recommande dans 48h. Scanner thoracique si aggravation.'
    analysis.confidence_score = 87.5
    analysis.raw_report = json.dumps(
        {
            'source': 'mock-fallback',
            'report': f"{analysis.findings}\n\n{analysis.impression}",
        },
        ensure_ascii=True,
    )


def apply_ai_result(analysis, result):
    """Apply AI microservice result to the model instance."""
    analysis.findings = result.get('findings', '')
    analysis.impression = result.get('impression', '')
    analysis.pathologies = result.get('pathologies', [])
    analysis.recommendations = result.get('recommendations', '')
    analysis.confidence_score = float(result.get('confidence_score', 0))

    metadata = {
        'source': 'ai-service',
        'raw_report': result.get('raw_report', ''),
        'agent1_labels': result.get('agent1_labels', []),
        'agent1_scores': result.get('agent1_scores', {}),
        'chexbert_labels': result.get('chexbert_labels', []),
        'quality_score': result.get('quality_score', 0),
        'accepted': result.get('accepted', False),
        'iterations': result.get('iterations', 1),
        'xai_method': result.get('xai_method', 'Grad-CAM'),
    }
    analysis.raw_report = json.dumps(metadata, ensure_ascii=True)

    xai_base64 = result.get('xai_image_base64')
    if xai_base64:
        try:
            decoded = base64.b64decode(xai_base64)
            filename = f"xai_{analysis.id}.png"
            analysis.xai_image.save(filename, ContentFile(decoded), save=False)
        except Exception as exc:
            logger.warning(f'Invalid xai_image_base64 payload: {str(exc)}')


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
        if not request.user.is_authenticated:
            return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)

        if not hasattr(request.user, 'doctor_profile'):
            return Response({'error': 'Doctor account required'}, status=status.HTTP_403_FORBIDDEN)

        image = request.FILES.get('image')
        patient_context = request.data.get('patient_context', '')
        patient_id = request.data.get('patient_id')
        
        # Validate image
        validate_image_file(image)
        
        # Save to database
        patient = None
        if patient_id:
            patient = PatientProfile.objects.filter(id=patient_id, doctor=request.user).first()

        analysis = XRayAnalysis.objects.create(image=image, doctor=request.user, patient=patient)
        logger.info(f'New analysis created: {analysis.id}')

        try:
            image.seek(0)
            ai_result = call_ai_service(image=image, patient_context=patient_context)
            apply_ai_result(analysis, ai_result)
        except requests.RequestException as exc:
            logger.error(f'AI service request failed: {str(exc)}')
            if settings.AI_FALLBACK_TO_MOCK:
                apply_mock_analysis(analysis)
            else:
                analysis.delete()
                return Response(
                    {'error': 'AI service unavailable. Try again later.'},
                    status=status.HTTP_503_SERVICE_UNAVAILABLE,
                )

        analysis.save()
        
        return Response({
            'id': analysis.id,
            'findings': analysis.findings,
            'impression': analysis.impression,
            'pathologies': analysis.pathologies,
            'recommendations': analysis.recommendations,
            'confidence_score': analysis.confidence_score,
            'raw_report': analysis.raw_report,
            'xai_image': request.build_absolute_uri(analysis.xai_image.url) if analysis.xai_image else None,
            'xai_method': 'Grad-CAM',
            'image_url': request.build_absolute_uri(analysis.image.url),
            'doctor_name': request.user.get_full_name() or request.user.username,
            'patient_name': analysis.patient.full_name if analysis.patient else None,
            'patient_id': analysis.patient.id if analysis.patient else None,
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
        if not request.user.is_authenticated:
            return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)

        if hasattr(request.user, 'doctor_profile'):
            analyses = XRayAnalysis.objects.filter(doctor=request.user)
        elif hasattr(request.user, 'patient_profile'):
            analyses = XRayAnalysis.objects.filter(patient=request.user.patient_profile)
        else:
            analyses = XRayAnalysis.objects.none()
        
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
        if not request.user.is_authenticated:
            return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)

        analysis = XRayAnalysis.objects.get(pk=pk)
        if hasattr(request.user, 'doctor_profile') and analysis.doctor_id != request.user.id:
            return Response({'error': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)
        if hasattr(request.user, 'patient_profile') and analysis.patient_id != request.user.patient_profile.id:
            return Response({'error': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)
        
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


@api_view(['POST'])
@permission_classes([AllowAny])
@parser_classes([JSONParser, FormParser, MultiPartParser])
def register_doctor(request):
    serializer = DoctorRegisterSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    user = serializer.save()
    refresh = RefreshToken.for_user(user)
    return Response({
        'user': AuthUserSerializer(user).data,
        'access': str(refresh.access_token),
        'refresh': str(refresh),
    }, status=status.HTTP_201_CREATED)


@api_view(['GET', 'POST'])
def create_patient(request):
    if not request.user.is_authenticated:
        return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)
    if not hasattr(request.user, 'doctor_profile'):
        return Response({'error': 'Doctor account required'}, status=status.HTTP_403_FORBIDDEN)

    if request.method == 'GET':
        patients = PatientProfile.objects.filter(doctor=request.user).order_by('-created_at')
        return Response({'results': PatientProfileSerializer(patients, many=True).data})

    serializer = PatientCreateSerializer(data=request.data, context={'request': request})
    serializer.is_valid(raise_exception=True)
    patient = serializer.save(doctor=request.user, created_by=request.user)
    return Response({'patient': PatientProfileSerializer(patient).data, 'id': patient.id}, status=status.HTTP_201_CREATED)


@api_view(['GET'])
def me(request):
    if not request.user.is_authenticated:
        return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)
    return Response(AuthUserSerializer(request.user).data)


@api_view(['GET'])
@permission_classes([AllowAny])
def api_root(_request):
    return Response({
        'status': 'ok',
        'service': 'medvision-api',
        'endpoints': {
            'token': '/api/auth/token/',
            'register_doctor': '/api/auth/register/doctor/',
            'me': '/api/auth/me/',
            'patients': '/api/auth/patients/',
            'doctors': '/api/auth/doctors/',
            'analyze': '/api/analyze/',
            'history': '/api/history/',
        },
    })


@api_view(['GET'])
def list_doctors(request):
    if not request.user.is_authenticated:
        return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)

    if not (request.user.is_staff or hasattr(request.user, 'doctor_profile')):
        return Response({'error': 'Doctor account required'}, status=status.HTTP_403_FORBIDDEN)

    doctors = User.objects.filter(doctor_profile__isnull=False).select_related('doctor_profile').order_by('username')
    return Response({
        'count': doctors.count(),
        'results': AuthUserSerializer(doctors, many=True).data,
    })
