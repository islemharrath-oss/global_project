from app.agents.agent1_cnn import Agent1CNN
from app.agents.agent2_medgemma import Agent2MedGemma
from app.agents.agent3_chexbert import Agent3CheXbert
from app.config import (
    CHEXBERT_MODEL_PATH,
    CNN_MODEL_PATH,
    MAX_REGEN_ATTEMPTS,
    MEDGEMMA_MODEL_PATH,
    QUALITY_THRESHOLD,
)


class MultiAgentOrchestrator:
    def __init__(self):
        self.agent1 = Agent1CNN(CNN_MODEL_PATH)
        self.agent2 = Agent2MedGemma(MEDGEMMA_MODEL_PATH)
        self.agent3 = Agent3CheXbert(CHEXBERT_MODEL_PATH)

    def model_status(self):
        return {
            "cnn_path": CNN_MODEL_PATH,
            "cnn_available": self.agent1.model_exists(),
            "medgemma_path": MEDGEMMA_MODEL_PATH,
            "medgemma_available": self.agent2.model_exists(),
            "chexbert_path": CHEXBERT_MODEL_PATH,
            "chexbert_available": self.agent3.model_exists(),
            "quality_threshold": QUALITY_THRESHOLD,
            "max_regen_attempts": MAX_REGEN_ATTEMPTS,
        }

    def run(self, image_bytes: bytes, image_name: str, patient_context: str):
        agent1_result = self.agent1.run(image_bytes=image_bytes, image_name=image_name)
        labels = agent1_result["labels"]
        scores = agent1_result["scores"]

        final_report = None
        final_eval = None
        iterations = 0
        feedback = ""

        for attempt in range(1, MAX_REGEN_ATTEMPTS + 1):
            generated = self.agent2.generate_report(
                labels=labels,
                scores=scores,
                patient_context=patient_context,
                retry_feedback=feedback,
            )
            evaluated = self.agent3.evaluate(
                report=generated["report"],
                reference_labels=labels,
            )

            iterations = attempt
            final_report = generated
            final_eval = evaluated

            if evaluated["quality_score"] >= QUALITY_THRESHOLD:
                break

            feedback = evaluated.get("feedback", "")

        return {
            "findings": final_report["findings"],
            "impression": final_report["impression"],
            "pathologies": labels,
            "recommendations": final_report["recommendations"],
            "confidence_score": round(max(scores.values()) * 100, 2) if scores else 0.0,
            "raw_report": final_report["report"],
            "xai_image_base64": agent1_result.get("xai_image_base64"),
            "xai_method": agent1_result.get("xai_method", "Grad-CAM"),
            "agent1_labels": labels,
            "agent1_scores": scores,
            "chexbert_labels": final_eval["extracted_labels"],
            "quality_score": final_eval["quality_score"],
            "accepted": final_eval["quality_score"] >= QUALITY_THRESHOLD,
            "iterations": iterations,
        }
