from pydantic import BaseModel


class AnalyzeResponse(BaseModel):
    findings: str
    impression: str
    pathologies: list[str]
    recommendations: str
    confidence_score: float
    raw_report: str
    xai_image_base64: str | None = None
    xai_method: str = "Grad-CAM"
    agent1_labels: list[str]
    agent1_scores: dict[str, float]
    chexbert_labels: list[str]
    quality_score: float
    accepted: bool
    iterations: int
