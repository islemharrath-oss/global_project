# MedVision Setup Guide

Complete step-by-step guide to set up the MedVision project for development and production.

## 📋 Table of Contents
1. [Prerequisites](#prerequisites)
2. [Development Setup](#development-setup)
3. [Production Setup](#production-setup)
4. [Environment Configuration](#environment-configuration)
5. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### System Requirements
- **OS:** Windows, macOS, or Linux
- **Python:** 3.10 or higher
- **Node.js:** 16.0 or higher
- **npm:** 8.0 or higher
- **Git:** 2.20 or higher (for version control)

### Installation Verification
```bash
# Check Python version
python --version
# Expected: Python 3.10+

# Check Node.js version
node --version
# Expected: v16.0.0 or higher

# Check npm version
npm --version
# Expected: 8.0.0 or higher
```

---

## Development Setup

### Step 1: Clone the Repository
```bash
git clone https://github.com/yourusername/medvision.git
cd medvision
```

### Step 2: Backend Setup

#### 2.1 Create and Activate Virtual Environment

**Windows:**
```bash
cd backend
python -m venv .venv
.\.venv\Scripts\activate
```

**macOS/Linux:**
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
```

#### 2.2 Install Python Dependencies
```bash
pip install --upgrade pip
pip install -r requirements.txt
```

#### 2.3 Create Environment File
```bash
# Copy the example file
cp .env.example .env

# Edit .env with your configuration
# Linux/macOS:
nano .env
# or use your favorite editor

# Windows (PowerShell):
notepad .env
```

**Example .env for development:**
```env
DEBUG=1
SECRET_KEY=django-insecure-your-secret-key-here
DJANGO_ALLOWED_HOSTS=localhost,127.0.0.1,0.0.0.0
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
MEDIA_URL=/media/
MEDIA_ROOT=media/
```

#### 2.4 Initialize Database
```bash
# Create migrations
python manage.py makemigrations

# Apply migrations
python manage.py migrate

# Create superuser (admin user)
python manage.py createsuperuser
# Follow prompts to create login credentials
```

#### 2.5 Run Development Server
```bash
python manage.py runserver 0.0.0.0:8000
```

**Output:**
```
Starting development server at http://127.0.0.1:8000/
Quit the server with CTRL-BREAK.
```

✅ Backend is now running at `http://localhost:8000/`

### Step 3: Frontend Setup

#### 3.1 Navigate to Frontend Directory
```bash
# In a NEW terminal/command prompt
cd frontend
```

#### 3.2 Create Environment File
```bash
# Copy the example file
cp .env.example .env

# Edit .env if needed (shouldn't require changes for local dev)
```

**Example .env:**
```env
REACT_APP_API_BASE_URL=http://localhost:8000/api
REACT_APP_ENV=development
```

#### 3.3 Install Node Dependencies
```bash
npm install
```

⏳ This may take 2-5 minutes depending on your connection.

#### 3.4 Run Development Server
```bash
npm start
```

**In browser:**
- React dev server starts at `http://localhost:3000/`
- Page auto-refreshes when you save files

### Step 4: Verify Setup

1. **Backend API:**
   - Navigate to `http://localhost:8000/admin`
   - Log in with superuser credentials
   - Should see X-Ray Analysis models

2. **Frontend:**
   - Navigate to `http://localhost:3000/`
   - Should see MedVision header and upload interface

3. **Test API Connection:**
   ```bash
   # In a terminal
   curl http://localhost:8000/api/history/
   # Should return: {"results": []}
   ```

✅ **Setup Complete!** Both servers are running.

---

## Production Setup

### Step 1: Server Preparation

**Update System Packages:**
```bash
# Ubuntu/Debian:
sudo apt update && sudo apt upgrade -y

# CentOS/RHEL:
sudo yum update -y
```

**Install System Dependencies:**
```bash
# Ubuntu/Debian:
sudo apt install -y python3.10 python3.10-venv python3-pip \
  nodejs npm postgresql postgresql-contrib nginx

# CentOS/RHEL:
sudo yum install -y python310 python310-devel nodejs npm \
  postgresql-server nginx
```

### Step 2: Backend Production Setup

#### 2.1 Clone and Setup
```bash
git clone https://github.com/yourusername/medvision.git /var/www/medvision
cd /var/www/medvision/backend

# Create virtual environment
python3.10 -m venv venv
source venv/bin/activate

# Install dependencies
pip install --upgrade pip
pip install -r requirements.txt
pip install gunicorn psycopg2-binary
```

#### 2.2 PostgreSQL Setup
```bash
# Create database and user
sudo -u postgres psql << EOF
CREATE DATABASE medvision_db;
CREATE USER medvision_user WITH PASSWORD 'strong_password_here';
ALTER ROLE medvision_user SET client_encoding TO 'utf8';
ALTER ROLE medvision_user SET default_transaction_isolation TO 'read committed';
ALTER ROLE medvision_user SET default_transaction_deferrable TO on;
ALTER ROLE medvision_user SET timezone TO 'UTC';
GRANT ALL PRIVILEGES ON DATABASE medvision_db TO medvision_user;
\q
EOF
```

#### 2.3 Environment Configuration
```bash
cp .env.example .env.production
nano .env.production
```

**Production .env template:**
```env
DEBUG=0
SECRET_KEY=your-super-secret-key-at-least-50-characters-long
DJANGO_ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com

# Database
DB_ENGINE=django.db.backends.postgresql
DB_NAME=medvision_db
DB_USER=medvision_user
DB_PASSWORD=strong_password_here
DB_HOST=localhost
DB_PORT=5432

# CORS
CORS_ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# Security
SECURE_SSL_REDIRECT=True
SESSION_COOKIE_SECURE=True
CSRF_COOKIE_SECURE=True
SECURE_HSTS_SECONDS=31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS=True
SECURE_HSTS_PRELOAD=True

# Email (optional)
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=app-specific-password
```

#### 2.4 Collect Static Files
```bash
# With PostgreSQL configured
python manage.py migrate
python manage.py collectstatic --noinput
```

#### 2.5 Create Systemd Service
```bash
# Create service file
sudo nano /etc/systemd/system/medvision.service
```

**Content:**
```ini
[Unit]
Description=MedVision Django Application
After=network.target postgresql.service

[Service]
Type=notify
User=www-data
Group=www-data
WorkingDirectory=/var/www/medvision/backend
Environment="PATH=/var/www/medvision/backend/venv/bin"
EnvironmentFile=/var/www/medvision/backend/.env.production
ExecStart=/var/www/medvision/backend/venv/bin/gunicorn \
    --workers 4 \
    --worker-class sync \
    --bind 127.0.0.1:8001 \
    --timeout 120 \
    --access-logfile /var/log/medvision/access.log \
    --error-logfile /var/log/medvision/error.log \
    crud.wsgi:application

Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

**Enable Service:**
```bash
sudo mkdir -p /var/log/medvision
sudo chown www-data:www-data /var/log/medvision
sudo systemctl daemon-reload
sudo systemctl enable medvision
sudo systemctl start medvision
sudo systemctl status medvision
```

### Step 3: Frontend Production Build

#### 3.1 Build Optimized Bundle
```bash
cd /var/www/medvision/frontend

# Install dependencies
npm install

# Create production build
npm run build
```

Output goes to `build/` directory

#### 3.2 Nginx Configuration
```bash
sudo nano /etc/nginx/sites-available/medvision
```

**Content:**
```nginx
# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

# HTTPS server
server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # React Frontend
    location / {
        root /var/www/medvision/frontend/build;
        try_files $uri /index.html;
    }

    # Media files (uploaded images)
    location /media/ {
        alias /var/www/medvision/backend/media/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # Static files (admin, DRF)
    location /static/ {
        alias /var/www/medvision/backend/staticfiles/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # API proxy to Django backend
    location /api/ {
        proxy_pass http://127.0.0.1:8001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        client_max_body_size 50M;
    }

    # Admin panel
    location /admin/ {
        proxy_pass http://127.0.0.1:8001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

**Enable Site:**
```bash
sudo ln -s /etc/nginx/sites-available/medvision /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

#### 3.3 SSL Certificate (Let's Encrypt)
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot certonly --nginx -d yourdomain.com -d www.yourdomain.com
```

### Step 4: Verify Production Setup
```bash
# Check Django service
sudo systemctl status medvision

# Check Nginx
sudo systemctl status nginx

# Test API
curl https://yourdomain.com/api/history/

# Check logs
sudo tail -f /var/log/medvision/error.log
```

---

## Environment Configuration

### Backend Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DEBUG` | ✓ | `1` | Enable Django debug mode (0 in production) |
| `SECRET_KEY` | ✓ | None | Django secret key (must be unique) |
| `DJANGO_ALLOWED_HOSTS` | ✓ | `localhost,127.0.0.1` | Allowed domain names (comma-separated) |
| `CORS_ALLOWED_ORIGINS` | ✓ | `http://localhost:3000` | Allowed frontend origins |
| `DB_ENGINE` | ✗ | SQLite | Database engine (postgresql, sqlite3, mysql) |
| `DB_NAME` | ✗ | db.sqlite3 | Database name |
| `SECURE_SSL_REDIRECT` | ✗ | False | Redirect HTTP to HTTPS |

### Frontend Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `REACT_APP_API_BASE_URL` | ✗ | `http://localhost:8000/api` | Backend API endpoint |

---

## Troubleshooting

### Port Already in Use

**Backend (port 8000):**
```bash
# Find process using port 8000
lsof -i :8000   # macOS/Linux
netstat -ano | findstr :8000  # Windows

# Kill process
kill -9 <PID>  # macOS/Linux
taskkill /PID <PID> /F  # Windows
```

**Frontend (port 3000):**
```bash
# Run on different port
PORT=3001 npm start
```

### Database Migration Errors

```bash
# Reset database (development only!)
rm db.sqlite3
python manage.py migrate

# Check migration status
python manage.py showmigrations
```

### CORS Errors

**In Browser Console:**
```
Access to XMLHttpRequest from origin 'http://localhost:3000' 
has been blocked by CORS policy
```

**Fix:**
1. Check `.env` has correct `CORS_ALLOWED_ORIGINS`
2. Ensure backend server is running
3. Clear browser cache and restart both servers

### Static Files Not Loading

```bash
# Collect static files
python manage.py collectstatic --noinput

# Check permissions
chmod -R 755 staticfiles/
```

### Module Import Errors

```bash
# Reinstall requirements (might be corrupted)
pip install --upgrade --force-reinstall -r requirements.txt
```

### Frontend Build Errors

```bash
# Clear Node cache and reinstall
rm -rf node_modules package-lock.json
npm install
npm start
```

---

## Next Steps

1. **Development:**
   - Review [Backend README](backend/README.md) for API documentation
   - Review [Frontend README](frontend/README.md) for component structure
   - Start implementing features in feature branches

2. **Before Production:**
   - [ ] Generate strong SECRET_KEY
   - [ ] Set DEBUG=0
   - [ ] Configure HTTPS/SSL
   - [ ] Set up automated backups
   - [ ] Review security checklist
   - [ ] Performance testing
   - [ ] User acceptance testing

3. **Monitoring:**
   - [ ] Set up error tracking (Sentry)
   - [ ] Enable application monitoring
   - [ ] Configure log aggregation
   - [ ] Set up performance monitoring

---

**Last Updated:** January 2024 | **Maintainer:** Your Name
