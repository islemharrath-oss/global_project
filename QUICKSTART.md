# Quick Start Guide

Fast setup for MedVision development.

## ⚡ 5-Minute Setup

### Prerequisites
- Python 3.10+
- Node.js 16+
- Git

### Backend
```bash
cd backend

# Windows
python -m venv .venv
.\.venv\Scripts\activate

# macOS/Linux
python3 -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Copy environment
cp .env.example .env

# Database
python manage.py migrate

# Run
python manage.py runserver
```

**Result:** API runs at `http://localhost:8000/`

### Frontend
```bash
cd frontend

# Install
npm install

# Copy environment (optional)
cp .env.example .env

# Run
npm start
```

**Result:** App runs at `http://localhost:3000/`

---

## 🐳 Docker Quick Start

```bash
# Build and start all services
docker-compose up -d

# Initialize database
docker-compose exec backend python manage.py migrate

# View logs
docker-compose logs -f backend
```

**Result:** 
- Application: http://localhost:3000
- API: http://localhost:8000/api
- Admin: http://localhost:8000/admin

---

## 📁 Important Directories

```
backend/
  manage.py          # Django CLI
  db.sqlite3        # Database (dev)
  media/            # Uploaded files
  logs/             # Application logs
  .env              # Configuration (don't commit!)

frontend/
  src/              # React components
  public/           # Static files
  build/            # Production build
  node_modules/     # Dependencies
  .env              # Configuration
```

---

## 🔧 Common Commands

### Backend
```bash
# Migration
python manage.py makemigrations
python manage.py migrate

# Admin user
python manage.py createsuperuser

# Static files
python manage.py collectstatic

# Tests
python manage.py test

# Interactive shell
python manage.py shell
```

### Frontend
```bash
# Install packages
npm install

# Run dev server
npm start

# Build for production
npm run build

# Run tests
npm test

# Lint and format
npm run lint
npm run format
```

### Docker
```bash
# Build all images
docker-compose build

# Start services
docker-compose up -d

# Stop services
docker-compose down

# View logs
docker-compose logs -f [service]

# Run command in container
docker-compose exec [service] [command]
```

---

## 📚 Key Files to Know

**Configuration:**
- `backend/.env` - Backend settings (create from .env.example)
- `frontend/.env` - Frontend settings
- `backend/crud/settings.py` - Django configuration

**Code Entry Points:**
- `backend/api/views.py` - API endpoints
- `backend/api/models.py` - Database models
- `frontend/src/App.js` - Main React component
- `frontend/src/api.js` - API client

**Documentation:**
- `README.md` - Project overview
- `SETUP.md` - Full setup guide
- `backend/README.md` - API docs
- `CONTRIBUTING.md` - Development standards

---

## 🆘 Troubleshooting

### Port in use
```bash
# Kill process on port
# Windows:
netstat -ano | findstr :8000
taskkill /PID [PID] /F

# macOS/Linux:
lsof -i :8000
kill -9 [PID]
```

### Module not found
```bash
# Reinstall dependencies
pip install --force-reinstall -r requirements.txt
npm install
```

### Database errors
```bash
# Reset database (dev only!)
rm db.sqlite3
python manage.py migrate
```

### CORS errors
Check `.env` has: `CORS_ALLOWED_ORIGINS=http://localhost:3000`

---

## ✅ Verify Setup

```bash
# Backend health check
curl http://localhost:8000/api/history/
# Should return: {"results": []}

# Frontend check
curl http://localhost:3000/
# Should return HTML

# Admin access
# Navigate to http://localhost:8000/admin
# Login with superuser credentials
```

---

## 🚀 Next Steps

1. **Read** `SETUP.md` for detailed setup
2. **Read** `backend/README.md` for API docs
3. **Read** `CONTRIBUTING.md` for code standards
4. **Explore** `frontend/src/components/` to understand UI structure
5. **Check** `backend/api/` for business logic

---

## 📞 Need Help?

- Check `SETUP.md` troubleshooting section
- Review `CONTRIBUTING.md` for standards
- Check `backend/README.md` for API details
- Read inline code comments

---

**Last Updated:** January 2024
