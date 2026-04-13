import os


class Agent2MedGemma:
    def __init__(self, model_path: str):
        self.model_path = model_path

    def model_exists(self) -> bool:
        return os.path.exists(self.model_path)

    def generate_report(
        self,
        labels: list[str],
        scores: dict[str, float],
        patient_context: str,
        retry_feedback: str = "",
    ) -> dict[str, str]:
        ordered = sorted(labels, key=lambda name: scores.get(name, 0.0), reverse=True)
        likely = ", ".join(ordered) if ordered else "No Finding"
        context = patient_context.strip() or "No additional clinical context provided."

        findings = (
            f"AI visual analysis highlights findings most consistent with: {likely}. "
            f"Clinical context: {context}."
        )
        if retry_feedback:
            findings += f" Validation feedback applied: {retry_feedback}."

        impression = f"Pattern is suggestive of {ordered[0] if ordered else 'No Finding'}."
        recommendations = (
            "Correlate with symptoms and vitals. Repeat imaging or CT if clinical condition worsens."
        )

        report = (
            "Findings: " + findings + "\n"
            "Impression: " + impression + "\n"
            "Recommendations: " + recommendations
        )

        return {
            "findings": findings,
            "impression": impression,
            "recommendations": recommendations,
            "report": report,
        }
