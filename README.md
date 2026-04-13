# MedVision - Medical X-ray Analysis Platform

A modern, full-stack web application for analyzing X-ray images using AI-powered diagnostics with explainable AI (XAI) visualization.

## Multi-Agent AI Service

This repository now includes a dedicated AI microservice for multi-agent inference orchestration.

- Setup guide: `AI_SERVICE_SETUP.md`
- Service endpoint (Docker): `http://localhost:9000`
- Django calls this service from `POST /api/analyze/`
- Database: PostgreSQL (`db` service in Docker)

## Doctor Portal Authentication

- Doctors create accounts and sign in with JWT authentication.
- Doctors can create patient accounts from the portal.
- Each analysis is linked to a doctor and optionally to a patient.
- History and analysis endpoints are secured and returned per user scope.

## 🎯 Project Overview

MedVision is a Django + React application designed to:
- Upload and analyze X-ray images
- Provide diagnostic reports with structured findings
- Visualize AI decision-making through Grad-CAM heatmaps
- Maintain a searchable history of analyses
- Ensure medical data privacy with local processing

> ⚠️ **Disclaimer**: MedVision is an aid-to-diagnosis tool only and does not replace professional medical consultation.

---

## 📋 Project Structure

```
projetPCD/
├── backend/                  # Django REST API
│   ├── api/                  # Main Django app
│   │   ├── models.py        # XRayAnalysis model
│   │   ├── views.py         # API endpoints
│   │   ├── serializers.py   # DRF serializers
│   │   └── admin.py         # Django admin configuration
│   ├── crud/                # Django project settings
│   │   ├── settings.py      # Main configuration
│   │   ├── urls.py          # URL routing
│   │   └── wsgi.py          # WSGI configuration
│   ├── media/               # Uploaded images and XAI visualizations
│   ├── manage.py            # Django management script
│   ├── requirements.txt      # Python dependencies
│   ├── .env.example         # Environment variables template
│   └── local_settings.py    # Local overrides (not tracked)
│
├── frontend/                 # React application
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── App.js           # Main application component
│   │   ├── api.js           # API client with error handling
│   │   └── index.js         # React entry point
│   ├── package.json         # Node dependencies
│   ├── .env.example         # Environment variables template
│   └── public/              # Static assets
│
├── .gitignore               # Git ignore patterns
└── README.md               # This file
```

---

## 🚀 Quick Start

### Prerequisites
- Python 3.10+ 
- Node.js 16+ & npm
- Git

### 1. Clone Repository
```bash
git clone <repository-url>
cd projetPCD
```

### 2. Backend Setup

```bash
# Navigate to backend
cd backend

# Create virtual environment
python -m venv .venv

# Activate virtual environment
# On Windows:
.\.venv\Scripts\activate
# On macOS/Linux:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create .env file (copy from .env.example and customize)
cp .env.example .env

# Run migrations
python manage.py migrate

# Create superuser (optional, for admin panel)
python manage.py createsuperuser

# Run development server
python manage.py runserver 8000
```

The backend will be available at `http://localhost:8000/`

### 3. Frontend Setup

```bash
# In a new terminal, navigate to frontend
cd frontend

# Install dependencies
npm install

# Create .env file (copy from .env.example if needed)
cp .env.example .env

# Start development server
npm start
```

The frontend will be available at `http://localhost:3000/`

---

## 🔌 API Endpoints

### Authentication
Currently, the API is open (no authentication required). For production, implement:
- JWT tokens
- Role-based access control (RBAC)
- Rate limiting

### Endpoints

#### POST `/api/analyze/`
Upload and analyze an X-ray image.

Requires a logged-in doctor account.

**Request:**
```bash
curl -X POST http://localhost:8000/api/analyze/ \
  -H "Authorization: Bearer <access_token>" \
  -F "image=@xray.jpg" \
  -F "patient_id=1"
```

#### Authentication endpoints

- `POST /api/auth/register/doctor/` - create a doctor account
- `POST /api/auth/token/` - login and get JWT tokens
- `POST /api/auth/token/refresh/` - refresh access token
- `GET /api/auth/me/` - current authenticated user
- `GET|POST /api/auth/patients/` - list or create patient accounts

**Response:**
```json
{
  "id": 1,
  "findings": "Opacités bilatérales...",
  "impression": "Compatible avec une pneumonie virale...",
  "pathologies": ["Pneumonie", "Infiltrats bilatéraux"],
  "recommendations": "Suivi clinique recommandé...",
  "confidence_score": 87.5,
  "image_url": "http://localhost:8000/media/xrays/image_123.jpg",
  "date": "2024-01-15T10:30:00Z"
}
```

#### GET `/api/history/`
Retrieve all analyses.

**Response:**
```json
{
  "results": [
    { /* analysis object */ },
    { /* analysis object */ }
  ]
}
```

#### DELETE `/api/history/<id>/`
Delete an analysis by ID.

**Response:** 204 No Content

---

## ⚙️ Configuration

### Environment Variables

Create a `.env` file in the backend directory (see `.env.example`):

```env
# Django
DEBUG=1  # Set to 0 in production
SECRET_KEY=your-secret-key-here
DJANGO_ALLOWED_HOSTS=localhost,127.0.0.1

# CORS (for frontend communication)
CORS_ALLOWED_ORIGINS=http://localhost:3000

# Media files
MEDIA_URL=/media/
MEDIA_ROOT=media/
```

Create a `.env` file in the frontend directory:

```env
REACT_APP_API_BASE_URL=http://localhost:8000/api
```

---

## 🔧 Development

### Backend

**Run tests:**
```bash
python manage.py test
```

**Create migrations:**
```bash
python manage.py makemigrations
python manage.py migrate
```

**Access Django Admin:**
Navigate to `http://localhost:8000/admin` (requires superuser)

### Frontend

**Run tests:**
```bash
npm test
```

**Build for production:**
```bash
npm run build
```

---

## 📦 Dependencies

### Backend
- **Django 6.0**: Web framework
- **Django REST Framework**: REST API toolkit
- **django-cors-headers**: CORS support
- **Pillow**: Image processing
- **python-decouple**: Environment configuration

### Frontend
- **React 19**: UI library
- **React Router**: Client-side routing
- **Material-UI**: Component library
- **React Testing Library**: Testing utilities

---

## 🔐 Security Considerations

### Current Implementation
- ✅ Environment variable configuration
- ✅ Input validation on API endpoints
- ✅ File size limits (10MB)
- ✅ CORS configuration
- ✅ Error handling without exposing sensitive data

### TODO: Production Hardening
- [ ] Implement JWT authentication
- [ ] Add rate limiting
- [ ] Enable HTTPS/SSL
- [ ] Set `SECURE_SSL_REDIRECT=True`
- [ ] Implement role-based access control
- [ ] Database encryption
- [ ] Regular security audits
- [ ] Add API documentation (Swagger/OpenAPI)

---

## 🚀 Integration Points

### MedGemma Integration
The analysis endpoint is designed to integrate with Google DeepMind's MedGemma model.

**Location:** [backend/api/views.py](backend/api/views.py#L60)

Currently, mock data is used. To integrate:

```python
from .medgemma import run_medgemma
result = run_medgemma(analysis.image.path)
# Parse result and populate analysis fields
```

### XAI / Grad-CAM
Placeholder for explainable AI visualization. Integrate your XAI library:

```python
from .xai_module import generate_heatmap
heatmap = generate_heatmap(image_path, model_output)
analysis.xai_image.save('heatmap.png', heatmap)
```

---

## 📚 Documentation

- [Backend API Documentation](backend/README.md) - Detailed API specs
- [Frontend Component Guide](frontend/README.md) - React components
- [Database Schema](backend/api/models.py) - Data models
- [Settings Configuration](backend/crud/settings.py) - Django settings

---

## 🤝 Contributing

1. Create a feature branch: `git checkout -b feature/amazing-feature`
2. Commit changes: `git commit -m "Add amazing feature"`
3. Push to branch: `git push origin feature/amazing-feature`
4. Open a Pull Request

### Code Style
- Python: Follow [PEP 8](https://pep8.org/)
- JavaScript: Use 2-space indentation, follow [Airbnb style guide](https://github.com/airbnb/javascript)

---

## 📝 License

This project is licensed under the MIT License - see LICENSE file for details.

---

## 👥 Support & Contact

For issues, feature requests, or contributions:
- 📧 Email: [your-email@example.com]
- 🐛 Issues: GitHub Issues
- 💬 Discussions: GitHub Discussions

---

## 🎓 Learning Resources

- [Django Documentation](https://docs.djangoproject.com/)
- [Django REST Framework](https://www.django-rest-framework.org/)
- [React Documentation](https://react.dev/)
- [Medical AI Ethical Guidelines](https://www.who.int/publications/i/item/ethics-and-governance-of-artificial-intelligence-for-health)

---

**Last Updated:** January 2024 | **Status:** Development



Ouvre http://localhost:8081
System: PostgreSQL
Server: db
Username: medvision_user
Password: medvision_password
Database: medvision_db
