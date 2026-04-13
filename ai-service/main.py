from fastapi import FastAPI, File, Form, UploadFile

from app.orchestrator import MultiAgentOrchestrator
from app.schemas import AnalyzeResponse

app = FastAPI(title="MedVision AI Service", version="0.1.0")
orchestrator = MultiAgentOrchestrator()


@app.get("/health")
def health():
    return {
        "status": "ok",
        "models": orchestrator.model_status(),
    }


@app.get("/models/status")
def models_status():
    return orchestrator.model_status()


@app.post("/analyze", response_model=AnalyzeResponse)
async def analyze_xray(
    image: UploadFile = File(...),
    patient_context: str = Form(default=""),
):
    image_bytes = await image.read()
    return orchestrator.run(
        image_bytes=image_bytes,
        image_name=image.filename or "uploaded-image",
        patient_context=patient_context,
    )
