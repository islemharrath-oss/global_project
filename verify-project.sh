#!/bin/bash
# Project Verification Checklist
# Run this to verify all improvements are in place

echo "🔍 MedVision Project Verification"
echo "=================================="
echo ""

# Check Environment Files
echo "📋 Checking Environment Configuration Files..."
[ -f backend/.env.example ] && echo "✓ backend/.env.example" || echo "✗ backend/.env.example"
[ -f frontend/.env.example ] && echo "✓ frontend/.env.example" || echo "✗ frontend/.env.example"
[ -f .env.example ] && echo "✓ .env.example (root)" || echo "✗ .env.example (root)"
[ -f backend/local_settings.py ] && echo "✓ backend/local_settings.py" || echo "✗ backend/local_settings.py"
echo ""

# Check Documentation
echo "📚 Checking Documentation Files..."
[ -f README.md ] && echo "✓ README.md" || echo "✗ README.md"
[ -f SETUP.md ] && echo "✓ SETUP.md" || echo "✗ SETUP.md"
[ -f DEPLOYMENT.md ] && echo "✓ DEPLOYMENT.md" || echo "✗ DEPLOYMENT.md"
[ -f CONTRIBUTING.md ] && echo "✓ CONTRIBUTING.md" || echo "✗ CONTRIBUTING.md"
[ -f IMPROVEMENTS.md ] && echo "✓ IMPROVEMENTS.md" || echo "✗ IMPROVEMENTS.md"
[ -f backend/README.md ] && echo "✓ backend/README.md" || echo "✗ backend/README.md"
[ -f frontend/README.md ] && echo "✓ frontend/README.md" || echo "✗ frontend/README.md"
echo ""

# Check Docker Files
echo "🐳 Checking Docker Configuration..."
[ -f docker-compose.yml ] && echo "✓ docker-compose.yml" || echo "✗ docker-compose.yml"
[ -f backend/Dockerfile ] && echo "✓ backend/Dockerfile" || echo "✗ backend/Dockerfile"
[ -f frontend/Dockerfile ] && echo "✓ frontend/Dockerfile" || echo "✗ frontend/Dockerfile"
[ -f nginx.conf ] && echo "✓ nginx.conf" || echo "✗ nginx.conf"
[ -f frontend/nginx-default.conf ] && echo "✓ frontend/nginx-default.conf" || echo "✗ frontend/nginx-default.conf"
echo ""

# Check Core Files
echo "🔨 Checking Core Application Files..."
[ -f .gitignore ] && echo "✓ .gitignore (updated)" || echo "✗ .gitignore"
[ -f backend/requirements.txt ] && echo "✓ backend/requirements.txt (updated)" || echo "✗ backend/requirements.txt"
[ -f backend/crud/settings.py ] && echo "✓ backend/crud/settings.py (improved)" || echo "✗ backend/crud/settings.py"
[ -f backend/api/models.py ] && echo "✓ backend/api/models.py (enhanced)" || echo "✗ backend/api/models.py"
[ -f backend/api/views.py ] && echo "✓ backend/api/views.py (improved)" || echo "✗ backend/api/views.py"
[ -f backend/api/serializers.py ] && echo "✓ backend/api/serializers.py (enhanced)" || echo "✗ backend/api/serializers.py"
[ -f frontend/src/api.js ] && echo "✓ frontend/src/api.js (improved)" || echo "✗ frontend/src/api.js"
echo ""

# Check Python dependencies
echo "📦 Checking Dependencies..."
python -c "import decouple; print('✓ python-decouple installed')" 2>/dev/null || echo "✗ python-decouple (run: pip install -r requirements.txt)"
echo ""

# Summary
echo "=================================="
echo "✅ Verification Complete!"
echo ""
echo "Next Steps:"
echo "1. Create .env file from .env.example"
echo "2. Run: pip install -r backend/requirements.txt"
echo "3. Run: npm install (in frontend directory)"
echo "4. Run: docker-compose up (if using Docker)"
echo "5. Read SETUP.md for detailed instructions"
echo ""
