# Backend API Documentation

## 📋 Overview

Django REST API for MedVision medical X-ray analysis platform.

## 🏗️ Project Structure

```
backend/
├── api/                      # Django application
│   ├── migrations/          # Database migrations
│   ├── __init__.py
│   ├── admin.py             # Django admin configuration
│   ├── apps.py              # Application config
│   ├── models.py            # Data models
│   ├── serializers.py       # DRF serializers
│   ├── tests.py             # Unit tests (TODO)
│   ├── urls.py              # API routes
│   └── views.py             # API views/endpoints
│
├── crud/                     # Django project
│   ├── __init__.py
│   ├── asgi.py              # ASGI config
│   ├── settings.py          # Main settings
│   ├── urls.py              # URL routing
│   └── wsgi.py              # WSGI config
│
├── media/                    # User uploads
│   ├── xrays/              # X-ray images
│   └── xai/                # XAI visualization images
│
├── .venv/                   # Virtual environment
├── manage.py                # Django CLI
├── requirements.txt         # Python dependencies
├── .env.example            # Environment template
└── README.md               # This file
```

## 🔌 API Endpoints

### 1. Analyze X-Ray Image
```
POST /api/analyze/
```

**Purpose:** Upload and analyze a medical X-ray image.

**Request:**
- Method: `POST`
- Content-Type: `multipart/form-data`
- Body: `image` (File, required)

**cURL Example:**
```bash
curl -X POST http://localhost:8000/api/analyze/ \
  -F "image=@patient_xray.jpg" \
  -H "Accept: application/json"
```

**Success Response:** `201 Created`
```json
{
  "id": 1,
  "findings": "Opacités bilatérales en verre dépoli dans les lobes inférieurs.",
  "impression": "Compatible avec une pneumonie virale bilatérale.",
  "pathologies": ["Pneumonie", "Infiltrats bilatéraux"],
  "recommendations": "Suivi clinique recommandé dans 48h. Scanner thoracique si aggravation.",
  "confidence_score": 87.5,
  "raw_report": "...",
  "xai_image": null,
  "xai_method": "Grad-CAM",
  "image_url": "http://localhost:8000/media/xrays/image_abc123.jpg",
  "date": "2024-01-15T10:30:00Z"
}
```

**Error Responses:**
```
400 Bad Request - No image provided or invalid format
  { "error": "Aucune image fournie" }

413 Payload Too Large - File exceeds 10MB
  { "error": "Fichier trop volumineux. Maximum: 10MB" }

500 Internal Server Error - Unexpected error
  { "error": "Erreur serveur. Veuillez réessayer plus tard." }
```

**Validation:**
- File size: Max 10MB
- Formats: JPG, JPEG, PNG, GIF
- Required field: image

---

### 2. Get Analysis History
```
GET /api/history/
```

**Purpose:** Retrieve all stored X-ray analyses.

**Query Parameters:**
- `limit` (optional): Maximum number of results
- `offset` (optional): Pagination offset (default: 0)

**cURL Example:**
```bash
# Get all analyses
curl http://localhost:8000/api/history/

# Get with pagination
curl "http://localhost:8000/api/history/?limit=10&offset=0"
```

**Response:** `200 OK`
```json
{
  "results": [
    {
      "id": 1,
      "date": "2024-01-15T10:30:00Z",
      "findings": "...",
      "impression": "...",
      "pathologies": ["Pneumonie"],
      "recommendations": "...",
      "confidence_score": 87.5,
      "image_url": "http://localhost:8000/media/xrays/image_abc.jpg",
      "xai_url": null
    },
    { /* more analyses */ }
  ]
}
```

---

### 3. Delete Analysis
```
DELETE /api/history/{id}/
```

**Purpose:** Delete a specific analysis and associated files.

**Path Parameters:**
- `id` (required): Analysis ID

**cURL Example:**
```bash
curl -X DELETE http://localhost:8000/api/history/1/
```

**Success Response:** `204 No Content`

**Error Responses:**
```
404 Not Found - Analysis doesn't exist
  { "error": "Analyse non trouvée" }

500 Internal Server Error - Unexpected error
  { "error": "Erreur lors de la suppression" }
```

---

## 📊 Data Models

### XRayAnalysis

**Fields:**
| Field | Type | Description |
|-------|------|-------------|
| id | AutoField | Primary key |
| image | ImageField | Original X-ray image |
| date | DateTimeField | Upload timestamp (auto) |
| findings | TextField | Radiological findings |
| impression | TextField | Clinical impression |
| pathologies | JSONField | List of detected pathologies |
| recommendations | TextField | Clinical recommendations |
| confidence_score | FloatField | Model confidence 0-100 |
| xai_image | ImageField (nullable) | Grad-CAM heatmap |
| raw_report | TextField | Complete report text |

**Methods:**
- `__str__()`: Returns formatted analysis identifier
- `class Meta`: Ordering by date (newest first), verbosity names

---

## 🔐 Security

### Current Implementation
✅ Environment-based configuration  
✅ Input validation (file type, size)  
✅ Error messages don't expose system details  
✅ CORS properly configured  
✅ File cleanup on delete  

### TODO: Production Hardening
- [ ] Django security middleware review
- [ ] SQL injection prevention testing
- [ ] XSS protection validation
- [ ] CSRF token implementation for form uploads
- [ ] Authentication layer (JWT/OAuth)
- [ ] Rate limiting per IP/user
- [ ] Database encryption at rest
- [ ] Audit logging for sensitive operations
- [ ] HTTPS enforcement
- [ ] Regular dependency scanning

---

## 🧪 Testing

### Run Tests
```bash
python manage.py test
```

### Coverage
```bash
pip install coverage
coverage run --source='.' manage.py test
coverage report
```

### Test Files
- `api/tests.py` - Unit tests (TODO: expand)

---

## 🔄 Development Workflow

### Create New Migration
```bash
python manage.py makemigrations
python manage.py migrate
```

### Run Development Server
```bash
python manage.py runserver 0.0.0.0:8000
```

### Access Django Admin
1. Navigate to `http://localhost:8000/admin`
2. Login with superuser credentials
3. Manage analyses, view media, etc.

### Create New API Endpoint

1. **Update models** (`api/models.py`)
```python
class NewModel(models.Model):
    field = models.CharField(max_length=100)
```

2. **Create serializer** (`api/serializers.py`)
```python
class NewModelSerializer(serializers.ModelSerializer):
    class Meta:
        model = NewModel
        fields = ['id', 'field']
```

3. **Add view** (`api/views.py`)
```python
@api_view(['GET'])
def get_new_data(request):
    data = NewModel.objects.all()
    serializer = NewModelSerializer(data, many=True)
    return Response(serializer.data)
```

4. **Add URL** (`api/urls.py`)
```python
path('new-endpoint/', views.get_new_data, name='new-endpoint')
```

---

## 📦 Dependencies

### Production
```
Django==5.2.12             # Web framework
djangorestframework==3.17.0 # REST API
django-cors-headers==4.9.0 # CORS support
Pillow==12.1.1            # Image processing
python-decouple==3.8      # Environment config
```

### Development (recommended)
```
pip install pytest pytest-django  # Testing
pip install black flake8         # Code quality
pip install django-extensions    # Debugging
```

---

## 🐛 Troubleshooting

### Import Errors
```bash
pip install --upgrade -r requirements.txt
```

### Database Errors
```bash
# Reset database (development only!)
rm db.sqlite3
python manage.py migrate
python manage.py createsuperuser
```

### CORS Errors
Ensure `.env` has correct `CORS_ALLOWED_ORIGINS`:
```env
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
```

### Media Files Not Loading
Ensure `DEBUG=1` in development and media URLs are configured.

---

## 📚 Additional Resources

- [Django Docs](https://docs.djangoproject.com/)
- [DRF Docs](https://www.django-rest-framework.org/)
- [Django Best Practices](https://docs.djangoproject.com/en/stable/misc/design-philosophies/)

---

**Last Updated:** January 2024
