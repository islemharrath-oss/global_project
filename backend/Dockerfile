# Backend Dockerfile for MedVision

# Build stage
FROM python:3.11-slim AS builder

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# 🔥 Create virtual environment AVANT installation
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Upgrade pip
RUN pip install --upgrade pip

# 🔥 Installer PyTorch dans le venv (FIX PRINCIPAL)
RUN pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu

# Copy requirements
COPY requirements.txt .

# Installer les dépendances
RUN pip install --no-cache-dir -r requirements.txt


# Production stage
FROM python:3.11-slim

WORKDIR /app

# Install runtime dependencies only
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy virtual environment from builder
COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Copy Django project
COPY . .

# Create necessary directories
RUN mkdir -p logs media staticfiles

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:8000/api/history/ || exit 1

# Run Gunicorn
CMD ["gunicorn", "--bind", "0.0.0.0:8000", "--workers", "4", "--timeout", "120", "crud.wsgi:application"]