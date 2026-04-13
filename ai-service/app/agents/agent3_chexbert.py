import os


class Agent3CheXbert:
    def __init__(self, model_path: str):
        self.model_path = model_path

    def model_exists(self) -> bool:
        return os.path.exists(self.model_path)

    def evaluate(self, report: str, reference_labels: list[str]) -> dict:
        lowered = report.lower()
        extracted = []
        for label in reference_labels:
            if label.lower() in lowered:
                extracted.append(label)

        overlap = 0.0
        if reference_labels:
            overlap = len(set(extracted)) / float(len(set(reference_labels)))

        confidence = 0.65 + (0.35 * overlap)
        quality_score = round((0.5 * overlap) + (0.5 * confidence), 3)

        missing = [label for label in reference_labels if label not in extracted]
        feedback = ""
        if missing:
            feedback = "Missing labels in report: " + ", ".join(missing)

        return {
            "extracted_labels": extracted,
            "overlap": round(overlap, 3),
            "confidence": round(confidence, 3),
            "quality_score": quality_score,
            "feedback": feedback,
        }
