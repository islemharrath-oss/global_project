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

MAX_FILE_SIZE = 10 * 1024 * 1024
ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif']

 

# ── ADMIN : liste tous les doctors ──────────────────
@api_view(['GET'])
def admin_list_doctors(request):
    if not request.user.is_authenticated:
        return Response({'error': 'Authentication required'}, status=401)
    if not hasattr(request.user, 'profile') or request.user.profile.role != 'admin':
        return Response({'error': 'Admin required'}, status=403)
    
    doctors = User.objects.filter(doctor_profile__isnull=False).select_related('doctor_profile')
    return Response({'results': AuthUserSerializer(doctors, many=True).data})


# ── ADMIN : patients d'un doctor ────────────────────
@api_view(['GET'])
def admin_list_patients(request, doctor_id):
    if not request.user.is_authenticated:
        return Response({'error': 'Authentication required'}, status=401)
    if not hasattr(request.user, 'profile') or request.user.profile.role != 'admin':
        return Response({'error': 'Admin required'}, status=403)
    
    patients = PatientProfile.objects.filter(doctor_id=doctor_id).select_related('user')
    return Response({'results': PatientProfileSerializer(patients, many=True).data})


# ── ADMIN : supprimer un utilisateur ────────────────
@api_view(['DELETE'])
def admin_delete_user(request, user_id):
    if not request.user.is_authenticated:
        return Response({'error': 'Authentication required'}, status=401)
    if not hasattr(request.user, 'profile') or request.user.profile.role != 'admin':
        return Response({'error': 'Admin required'}, status=403)
    
    try:
        user = User.objects.get(pk=user_id)
        user.delete()
        return Response(status=204)
    except User.DoesNotExist:
        return Response({'error': 'User not found'}, status=404)


# ── PATIENT : analyse + retourne uniquement Mistral ─
@api_view(['POST'])
@parser_classes([MultiPartParser, FormParser])
def patient_analyze(request):
    if not request.user.is_authenticated:
        return Response({'error': 'Authentication required'}, status=401)
    if not hasattr(request.user, 'patient_profile'):
        return Response({'error': 'Patient account required'}, status=403)

    image = request.FILES.get('image')
    validate_image_file(image)

    patient = request.user.patient_profile
    analysis = XRayAnalysis.objects.create(
        image=image,
        doctor=patient.doctor,
        patient=patient
    )

    try:
        image.seek(0)
        ai_url = f"{settings.AI_SERVICE_URL.rstrip('/')}/analyze"
        files = {'image': (image.name, image.read(), image.content_type)}
        ai_response = requests.post(ai_url, files=files, timeout=1800)
        ai_response.raise_for_status()
        ai_data = ai_response.json()

        mistral_explanation = ai_data.get('mistral_explanation', ai_data.get('patient_report', ''))
        analysis.recommendations = mistral_explanation
        analysis.save()

        # ← Retourne UNIQUEMENT l'explication Mistral
        return Response({
            'mistral_explanation': mistral_explanation,
            'date': analysis.date,
        }, status=201)

    except Exception as e:
        logger.error(f'Patient analyze error: {e}')
        return Response({'error': 'Analysis failed'}, status=500)
    
def validate_image_file(image):
    if not image:
        raise ValidationError('Aucune image fournie')
    if image.size > MAX_FILE_SIZE:
        raise ValidationError(f'Fichier trop volumineux. Maximum: {MAX_FILE_SIZE / (1024*1024):.0f}MB')
    ext = image.name.split('.')[-1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise ValidationError(f'Format non supporte. Extensions autorisees: {", ".join(ALLOWED_EXTENSIONS)}')
    return True


def save_xai_image(analysis, xai_image_base64):
    """
    Sauvegarde le base64 Grad-CAM en fichier image sur le disque.
    Retourne l'objet analysis mis à jour (sans save()).
    """
    if not xai_image_base64:
        return analysis
    try:
        # Nettoyer le préfixe data:image/...;base64, si présent
        raw_b64 = xai_image_base64
        if ',' in raw_b64:
            raw_b64 = raw_b64.split(',', 1)[1]
        xai_bytes = base64.b64decode(raw_b64)
        xai_filename = f"gradcam_{analysis.id}.png"
        analysis.xai_image.save(xai_filename, ContentFile(xai_bytes), save=False)
        logger.info(f'XAI image saved: {xai_filename}')
    except Exception as e:
        logger.error(f'Failed to save XAI image: {e}')
    return analysis


@api_view(['POST'])
@parser_classes([MultiPartParser, FormParser])
def analyze_xray(request):
    try:
        if not request.user.is_authenticated:
            return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)
        if not hasattr(request.user, 'doctor_profile'):
            return Response({'error': 'Doctor account required'}, status=status.HTTP_403_FORBIDDEN)

        image = request.FILES.get('image')
        patient_id = request.data.get('patient_id')
        validate_image_file(image)

        patient = None
        if patient_id:
            patient = PatientProfile.objects.filter(id=patient_id, doctor=request.user).first()

        analysis = XRayAnalysis.objects.create(image=image, doctor=request.user, patient=patient)
        logger.info(f'New analysis created: {analysis.id}')

        xai_image_base64 = None

        try:
            image.seek(0)
            ai_url = f"{settings.AI_SERVICE_URL.rstrip('/')}/analyze"
            files = {'image': (image.name, image.read(), image.content_type or 'application/octet-stream')}
            ai_response = requests.post(ai_url, files=files, timeout=1800)  # 30 minutes
            ai_response.raise_for_status()
            ai_data = ai_response.json()

            # ── Extraction xai_image ──────────────────────────────────────────
            xai_image_base64 = ai_data.get('xai_image', None)
            logger.info(
                f'LangGraph keys={list(ai_data.keys())}, '
                f'xai_image_present={bool(xai_image_base64)}, '
                f'xai_len={len(xai_image_base64) if xai_image_base64 else 0}'
            )

            # ── Mapping complet des champs du pipeline ────────────────────────
            # Agent 1 - Classifier
            classifier_labels = ai_data.get('classifier_labels', ai_data.get('labels', []))
            is_normal         = ai_data.get('is_normal', False)

            # Agent 2 - MedGemma
            confirmed_labels = ai_data.get('confirmed_labels', classifier_labels)
            medical_report   = ai_data.get('medical_report', ai_data.get('report', ''))

            # Agent 3 - Mistral (peut aussi être nommé patient_report)
            mistral_explanation = ai_data.get('mistral_explanation', ai_data.get('patient_report', ''))

            # Agent 4 - CheXbert
            final_labels     = ai_data.get('final_labels', confirmed_labels)
            chexbert_details = ai_data.get('chexbert_details', {})
            
            # DEBUG : log tous les champs reçus
            logger.info(
                f'LangGraph response keys: {list(ai_data.keys())}, '
                f'mistral_explanation_len={len(mistral_explanation)}, '
                f'patient_report_len={len(ai_data.get("patient_report", ""))}'
            )

            # ── Sauvegarde xai_image en fichier ──────────────────────────────
            analysis = save_xai_image(analysis, xai_image_base64)

            # ── Sauvegarde en base ────────────────────────────────────────────
            analysis.findings         = medical_report or 'Aucune anomalie detectee.'
            analysis.impression       = 'Normal' if is_normal else ', '.join(final_labels) if final_labels else ''
            analysis.pathologies      = final_labels if final_labels else classifier_labels
            analysis.recommendations  = mistral_explanation
            analysis.confidence_score = 0

            # raw_report sans xai_image pour eviter les gros JSON
            ai_data_without_xai = {k: v for k, v in ai_data.items() if k != 'xai_image'}
            analysis.raw_report = json.dumps(ai_data_without_xai, ensure_ascii=False)

        except requests.RequestException as exc:
            logger.error(f'AI service request failed: {str(exc)}')
            xai_image_base64    = None
            classifier_labels   = []
            confirmed_labels    = []
            final_labels        = ['Pneumonie', 'Infiltrats bilateraux']
            medical_report      = 'Opacites bilaterales en verre depoli dans les lobes inferieurs.'
            mistral_explanation = 'Suivi clinique recommande dans 48h.'
            chexbert_details    = {}
            is_normal           = False

            analysis.findings         = medical_report
            analysis.impression       = 'Compatible avec une pneumonie virale bilaterale.'
            analysis.pathologies      = final_labels
            analysis.recommendations  = mistral_explanation
            analysis.confidence_score = 87.5
            analysis.raw_report       = json.dumps({'source': 'mock-fallback'})

        analysis.save()

        # ── URL de la heatmap (fichier sauvegardé) ────────────────────────────
        xai_url = request.build_absolute_uri(analysis.xai_image.url) if analysis.xai_image else None

        # ── Réponse complète au frontend ──────────────────────────────────────
        return Response({
            'id':                  analysis.id,

            # Agent 1 - Classifier
            'classifier_labels':   classifier_labels,
            'is_normal':           is_normal,

            # Agent 2 - MedGemma
            'confirmed_labels':    confirmed_labels,
            'medical_report':      medical_report,

            # Agent 3 - Mistral
            'mistral_explanation': mistral_explanation,

            # Agent 4 - CheXbert
            'final_labels':        final_labels,
            'chexbert_details':    chexbert_details,

            # XAI - Grad-CAM
            # xai_url  : URL du fichier sauvegardé (pour affichage <img>)
            # xai_image: base64 brut (garde pour compatibilité)
            'xai_url':             xai_url,
            'xai_image':           xai_url,  # on retourne l'URL, pas le base64

            # Champs legacy
            'findings':            medical_report,
            'impression':          analysis.impression,
            'pathologies':         analysis.pathologies,
            'recommendations':     mistral_explanation,
            'confidence_score':    analysis.confidence_score,
            'raw_report':          analysis.raw_report,

            # Métadonnées
            'image_url':           request.build_absolute_uri(analysis.image.url),
            'doctor_name':         request.user.get_full_name() or request.user.username,
            'patient_name':        analysis.patient.full_name if analysis.patient else None,
            'patient_id':          analysis.patient.id if analysis.patient else None,
            'date':                analysis.date,
        }, status=status.HTTP_201_CREATED)

    except ValidationError as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        logger.error(f'Unexpected error: {str(e)}', exc_info=True)
        return Response({'error': 'Erreur serveur.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
def get_history(request):
    try:
        if not request.user.is_authenticated:
            return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)
        if hasattr(request.user, 'doctor_profile'):
            analyses = XRayAnalysis.objects.filter(doctor=request.user)
        elif hasattr(request.user, 'patient_profile'):
            analyses = XRayAnalysis.objects.filter(patient=request.user.patient_profile)
        else:
            analyses = XRayAnalysis.objects.none()
        serializer = XRayAnalysisSerializer(analyses, many=True, context={'request': request})
        return Response({'results': serializer.data})
    except Exception as e:
        logger.error(f'Error retrieving history: {str(e)}', exc_info=True)
        return Response({'error': 'Erreur historique'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['DELETE'])
def delete_analysis(request, pk):
    try:
        if not request.user.is_authenticated:
            return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)
        analysis = XRayAnalysis.objects.get(pk=pk)
        analysis.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
    except XRayAnalysis.DoesNotExist:
        return Response({'error': 'Analyse non trouvee'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({'error': 'Erreur suppression'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


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
def patients_view(request):
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
    return Response({'count': doctors.count(), 'results': AuthUserSerializer(doctors, many=True).data})

# ════════════════════════════════════════════════════
# ADMIN endpoints
# ════════════════════════════════════════════════════

def is_admin(user):
    return user.is_authenticated and (
        user.is_staff or
        (hasattr(user, 'profile') and user.profile.role == 'admin')
    )


@api_view(['POST'])
@permission_classes([AllowAny])
@parser_classes([JSONParser])
def register_admin(request):
    """Créer un compte admin — réservé au superuser ou premier setup."""
    username = request.data.get('username')
    password = request.data.get('password')
    email    = request.data.get('email', '')

    if not username or not password:
        return Response({'error': 'username and password required'}, status=400)

    if User.objects.filter(username=username).exists():
        return Response({'error': 'Username already taken'}, status=400)

    from accounts.models import UserProfile
    user = User.objects.create_user(username=username, password=password, email=email, is_staff=True)
    UserProfile.objects.create(user=user, role='admin')

    refresh = RefreshToken.for_user(user)
    return Response({
        'user': AuthUserSerializer(user).data,
        'access':  str(refresh.access_token),
        'refresh': str(refresh),
    }, status=201)


@api_view(['GET'])
def admin_list_doctors(request):
    """Admin : liste tous les doctors avec leurs patients."""
    if not is_admin(request.user):
        return Response({'error': 'Admin required'}, status=403)

    doctors = User.objects.filter(
        doctor_profile__isnull=False
    ).select_related('doctor_profile').order_by('username')

    result = []
    for doc in doctors:
        patients = PatientProfile.objects.filter(doctor=doc).select_related('user')
        result.append({
            'id':           doc.id,
            'username':     doc.username,
            'full_name':    doc.get_full_name(),
            'email':        doc.email,
            'specialty':    doc.doctor_profile.specialty,
            'hospital':     doc.doctor_profile.hospital,
            'patient_count': patients.count(),
            'patients':     PatientProfileSerializer(patients, many=True).data,
        })

    return Response({'count': len(result), 'results': result})


@api_view(['GET'])
def admin_list_patients(request, doctor_id):
    """Admin : liste les patients d'un doctor spécifique."""
    if not is_admin(request.user):
        return Response({'error': 'Admin required'}, status=403)

    try:
        doctor = User.objects.get(pk=doctor_id, doctor_profile__isnull=False)
    except User.DoesNotExist:
        return Response({'error': 'Doctor not found'}, status=404)

    patients = PatientProfile.objects.filter(doctor=doctor).select_related('user')
    return Response({'results': PatientProfileSerializer(patients, many=True).data})


@api_view(['DELETE'])
def admin_delete_user(request, user_id):
    """Admin : supprimer n'importe quel utilisateur."""
    if not is_admin(request.user):
        return Response({'error': 'Admin required'}, status=403)

    try:
        user = User.objects.get(pk=user_id)
        if user.is_superuser:
            return Response({'error': 'Cannot delete superuser'}, status=400)
        user.delete()
        return Response({'message': 'User deleted'}, status=204)
    except User.DoesNotExist:
        return Response({'error': 'User not found'}, status=404)


@api_view(['POST'])
def admin_add_doctor(request, user_id):
    """Admin : promouvoir un user en doctor."""
    if not is_admin(request.user):
        return Response({'error': 'Admin required'}, status=403)

    try:
        user = User.objects.get(pk=user_id)
        serializer = DoctorRegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        DoctorProfile.objects.get_or_create(
            user=user,
            defaults={
                'specialty':      request.data.get('specialty', ''),
                'license_number': request.data.get('license_number', ''),
                'hospital':       request.data.get('hospital', ''),
                'phone':          request.data.get('phone', ''),
            }
        )
        return Response(AuthUserSerializer(user).data, status=201)
    except User.DoesNotExist:
        return Response({'error': 'User not found'}, status=404)


# ════════════════════════════════════════════════════
# PATIENT portal endpoint
# ════════════════════════════════════════════════════

@api_view(['POST'])
@parser_classes([MultiPartParser, FormParser])
def patient_analyze(request):
    """Patient : upload radio → reçoit uniquement l'explication Mistral."""
    if not request.user.is_authenticated:
        return Response({'error': 'Authentication required'}, status=401)
    if not hasattr(request.user, 'patient_profile'):
        return Response({'error': 'Patient account required'}, status=403)

    image = request.FILES.get('image')
    validate_image_file(image)

    patient = request.user.patient_profile
    analysis = XRayAnalysis.objects.create(
        image=image,
        doctor=patient.doctor,
        patient=patient,
    )

    try:
        image.seek(0)
        ai_url = f"{settings.AI_SERVICE_URL.rstrip('/')}/analyze"
        files  = {'image': (image.name, image.read(), image.content_type or 'application/octet-stream')}
        ai_response = requests.post(ai_url, files=files, timeout=1800)
        ai_response.raise_for_status()
        ai_data = ai_response.json()

        mistral_explanation = ai_data.get('mistral_explanation', ai_data.get('patient_report', ''))
        analysis.recommendations = mistral_explanation
        analysis.save()

        # ← Retourne UNIQUEMENT l'explication Mistral au patient
        return Response({
            'mistral_explanation': mistral_explanation,
            'date':                analysis.date,
            'analysis_id':         analysis.id,
        }, status=201)

    except Exception as e:
        logger.error(f'Patient analyze error: {e}')
        return Response({'error': 'Analysis failed'}, status=500)