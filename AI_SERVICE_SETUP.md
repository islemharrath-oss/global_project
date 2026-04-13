# AI Service Setup (Multi-Agent)

This project now includes a dedicated AI microservice:

- Agent 1 (CNN): image -> labels + confidence + XAI metadata
- Agent 2 (MedGemma): labels + context -> report generation
- Agent 3 (CheXbert): report validation + quality score
- Orchestrator loop: if score < threshold, regenerate report (up to max attempts)

## 1) Put Model Weights Outside Git

Do not commit model weights to GitHub. Place them in:

- models/cnn/
- models/medgemma/
- models/chexbert/

`docker-compose.yml` mounts this folder to the AI container at `/models`.

## 2) Build and Run

```bash
docker compose up --build -d
```

If you are switching from the old SQLite setup, remove the local database file first:

```powershell
Remove-Item backend\db.sqlite3
```

Then run migrations inside the backend container:

```bash
docker compose exec backend python manage.py migrate
```

## 3) Health Checks

```bash
# AI service
curl http://localhost:9000/health

# Django backend
curl http://localhost:8000/api/history/

# Nginx
curl http://localhost/
```

## 4) Important Environment Variables

Backend (`backend/.env`):

- `AI_SERVICE_URL=http://ai-service:9000`
- `AI_SERVICE_TIMEOUT=120`
- `AI_FALLBACK_TO_MOCK=True`

AI service (in compose):

- `MODEL_ROOT=/models`
- `CNN_MODEL_PATH=/models/cnn`
- `MEDGEMMA_MODEL_PATH=/models/medgemma`
- `CHEXBERT_MODEL_PATH=/models/chexbert`
- `QUALITY_THRESHOLD=0.7`
- `MAX_REGEN_ATTEMPTS=3`

## 5) Integration Behavior

When `POST /api/analyze/` is called on Django:

1. Image is saved in Django.
2. Django sends image to AI service `/analyze`.
3. AI pipeline runs Agent1 -> Agent2 -> Agent3 with retry loop.
4. Django stores final report fields in `XRayAnalysis`.
5. If AI service is down and `AI_FALLBACK_TO_MOCK=True`, Django uses mock fallback.
