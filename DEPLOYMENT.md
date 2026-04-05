# Deployment Guide

Complete guide to deploy MedVision to production environments.

## 📋 Table of Contents

1. [Docker Deployment](#docker-deployment)
2. [Traditional Server Deployment](#traditional-server-deployment)
3. [Cloud Deployment](#cloud-deployment)
4. [Monitoring & Maintenance](#monitoring--maintenance)

---

## Docker Deployment

### Quick Start with Docker Compose

**Prerequisites:**
- Docker & Docker Compose installed
- At least 4GB RAM, 2GB disk space

### Step 1: Build and Run

```bash
# Build all services
docker-compose build

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f backend
docker-compose logs -f frontend

# Stop services
docker-compose down
```

### Step 2: Initialize Database

```bash
# Run migrations
docker-compose exec backend python manage.py migrate

# Create superuser
docker-compose exec backend python manage.py createsuperuser

# Collect static files
docker-compose exec backend python manage.py collectstatic --noinput
```

### Step 3: Access Application

- **Application:** http://localhost:3000
- **API:** http://localhost:8000/api
- **Admin:** http://localhost:8000/admin

### Docker Compose Services

| Service | Container | Port | Purpose |
|---------|-----------|------|---------|
| db | postgres:15-alpine | 5432 | PostgreSQL database |
| backend | Python 3.11 | 8000 | Django REST API |
| frontend | Node 18 + nginx | 3000 | React application |
| nginx | nginx:alpine | 80/443 | Reverse proxy |

### Management Commands

```bash
# View logs
docker-compose logs [service_name]
docker-compose logs -f --tail=50 backend

# Execute commands in container
docker-compose exec backend python manage.py migrate
docker-compose exec frontend npm test

# Stop/Restart services
docker-compose stop backend
docker-compose restart frontend

# Remove all containers and volumes (WARNING: Data loss!)
docker-compose down -v

# Update and rebuild
docker-compose pull
docker-compose up -d --build
```

### Backup & Restore

**Backup Database:**
```bash
docker-compose exec db pg_dump -U medvision_user medvision_db > backup.sql
```

**Restore Database:**
```bash
docker-compose exec -T db psql -U medvision_user medvision_db < backup.sql
```

**Backup Media Files:**
```bash
docker cp medvision-backend:/app/media ./media_backup
```

---

## Traditional Server Deployment

### Prerequisites

- Ubuntu 20.04+ or CentOS 8+
- Python 3.10+, Node.js 16+
- PostgreSQL 12+
- Nginx, Supervisor

### Step 1: System Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install dependencies
sudo apt install -y python3.10 python3.10-venv python3-pip \
    nodejs npm postgresql postgresql-contrib nginx \
    supervisor git curl wget
```

### Step 2: Deploy Application

```bash
# Create application user
sudo useradd -m -s /bin/bash medvision

# Clone repository
sudo -u medvision mkdir -p /opt/medvision
sudo -u medvision git clone <repo-url> /opt/medvision

cd /opt/medvision

# Setup backend
cd backend
sudo -u medvision python3.10 -m venv venv
sudo -u medvision venv/bin/pip install --upgrade pip
sudo -u medvision venv/bin/pip install -r requirements.txt
sudo -u medvision venv/bin/pip install gunicorn psycopg2-binary

# Setup frontend
cd ../frontend
sudo -u medvision npm install
sudo -u medvision npm run build
```

### Step 3: PostgreSQL Setup

```bash
# Create database
sudo -u postgres psql << EOF
CREATE DATABASE medvision_db;
CREATE USER medvision_user WITH PASSWORD 'strong_password';
ALTER ROLE medvision_user SET client_encoding TO 'utf8';
GRANT ALL PRIVILEGES ON DATABASE medvision_db TO medvision_user;
EOF

# Verify
sudo -u postgres psql -c "\\l"
```

### Step 4: Configure Django

```bash
cd /opt/medvision/backend

# Create .env file
sudo nano .env

# Content:
DEBUG=0
SECRET_KEY=your-secret-key
DJANGO_ALLOWED_HOSTS=yourdomain.com
DB_NAME=medvision_db
DB_USER=medvision_user
DB_PASSWORD=strong_password
DB_HOST=localhost
DB_PORT=5432

# Run migrations
sudo -u medvision venv/bin/python manage.py migrate

# Collect static files
sudo -u medvision venv/bin/python manage.py collectstatic --noinput
```

### Step 5: Configure Nginx

```bash
# Create Nginx config
sudo nano /etc/nginx/sites-available/medvision
```

**Content:**
```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    client_max_body_size 50M;

    # Static files
    location /static/ {
        alias /opt/medvision/backend/staticfiles/;
    }

    # Media files
    location /media/ {
        alias /opt/medvision/backend/media/;
    }

    # API
    location /api/ {
        proxy_pass http://127.0.0.1:8001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Admin
    location /admin/ {
        proxy_pass http://127.0.0.1:8001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # React app
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
```

Enable site:
```bash
sudo ln -s /etc/nginx/sites-available/medvision /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### Step 6: Configure Supervisor

**Django Service:**
```bash
sudo nano /etc/supervisor/conf.d/medvision-backend.conf
```

Content:
```ini
[program:medvision-backend]
directory=/opt/medvision/backend
command=/opt/medvision/backend/venv/bin/gunicorn \
    --workers 4 \
    --bind 127.0.0.1:8001 \
    --timeout 120 \
    crud.wsgi:application
user=medvision
autostart=true
autorestart=true
redirect_stderr=true
stdout_logfile=/var/log/medvision-backend.log
```

**React Service:**
```bash
sudo nano /etc/supervisor/conf.d/medvision-frontend.conf
```

Content:
```ini
[program:medvision-frontend]
directory=/opt/medvision/frontend
command=npm start
user=medvision
autostart=true
autorestart=true
redirect_stderr=true
stdout_logfile=/var/log/medvision-frontend.log
environment=PATH="/usr/bin",NODE_ENV="production"
```

Enable services:
```bash
sudo supervisorctl reread
sudo supervisorctl update
sudo supervisorctl start medvision-backend medvision-frontend
sudo supervisorctl status

# View logs
sudo tail -f /var/log/medvision-backend.log
sudo tail -f /var/log/medvision-frontend.log
```

### Step 7: SSL with Let's Encrypt

```bash
sudo apt install certbot python3-certbot-nginx

sudo certbot certonly --nginx -d yourdomain.com -d www.yourdomain.com

# Update Nginx to use HTTPS (modify /etc/nginx/sites-available/medvision)
# Add SSL certificate paths and redirect HTTP to HTTPS
```

---

## Cloud Deployment

### Heroku Deployment

```bash
# Login
heroku login

# Create app
heroku create medvision-app

# Add PostgreSQL
heroku addons:create heroku-postgresql:hobby-dev

# Set environment variables
heroku config:set DEBUG=0
heroku config:set SECRET_KEY=your-secret-key
heroku config:set DJANGO_ALLOWED_HOSTS=medvision-app.herokuapp.com

# Deploy
git push heroku main

# Run migrations
heroku run python backend/manage.py migrate
```

### AWS Elastic Beanstalk

```bash
# Install EB CLI
pip install awsebcli

# Initialize
eb init -p python-3.10 medvision

# Create environment
eb create medvision-prod

# Deploy
eb deploy

# Monitor
eb logs
eb status
```

### Digital Ocean App Platform

1. Connect GitHub repository
2. Create new app from repository
3. Configure environment variables
4. Set build/run commands
5. Deploy

---

## Monitoring & Maintenance

### Health Checks

```bash
# API health
curl -I http://localhost:8000/api/history/

# Frontend health
curl -I http://localhost:3000/

# Database
sudo -u postgres psql -c "SELECT 1"
```

### Logs

```bash
# Docker Compose
docker-compose logs -f --tail=100 backend

# Traditional
sudo tail -f /var/log/medvision-backend.log
sudo tail -f /var/log/medvision-frontend.log
sudo tail -f /var/log/nginx/error.log
```

### Backup Schedule

```bash
# Daily backup at 2 AM
0 2 * * * /usr/local/bin/backup-medvision.sh
```

**Backup Script:**
```bash
#!/bin/bash
BACKUP_DIR="/backups/medvision"
DATE=$(date +%Y-%m-%d_%H-%M-%S)

# Database backup
docker-compose exec -T db pg_dump -U medvision_user medvision_db | \
    gzip > $BACKUP_DIR/db_$DATE.sql.gz

# Media backup
tar -czf $BACKUP_DIR/media_$DATE.tar.gz /opt/medvision/backend/media/

# Keep only last 30 days
find $BACKUP_DIR -mtime +30 -delete
```

### Performance Monitoring

Install and configure:
- **New Relic** - Application monitoring
- **Datadog** - Infrastructure monitoring
- **Prometheus** - Metrics collection
- **ELK Stack** - Log aggregation

### Security Updates

```bash
# Update Docker images
docker-compose pull
docker-compose up -d

# Update packages
pip install --upgrade -r requirements.txt
npm update
```

---

## Troubleshooting

### Service won't start
```bash
# Check logs
docker-compose logs backend
docker logs medvision-backend

# Restart
docker-compose restart backend
sudo supervisorctl restart medvision-backend
```

### Database connection errors
```bash
# Test connection
psql -h localhost -U medvision_user -d medvision_db -c "SELECT 1"

# Check permissions
sudo -u postgres psql -c "\du"
```

### Out of disk space
```bash
# Check usage
docker system df
df -h

# Clean up Docker
docker system prune -a
```

---

**Last Updated:** January 2024
