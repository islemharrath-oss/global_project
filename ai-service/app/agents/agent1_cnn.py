import hashlib
import os
from typing import Any


CHEXBERT_LABEL_SPACE = [
    "Atelectasis",
    "Cardiomegaly",
    "Consolidation",
    "Edema",
    "Enlarged Cardiomediastinum",
    "Fracture",
    "Lung Lesion",
    "Lung Opacity",
    "No Finding",
    "Pleural Effusion",
    "Pleural Other",
    "Pneumonia",
    "Pneumothorax",
    "Support Devices",
]


class Agent1CNN:
    def __init__(self, model_path: str):
        self.model_path = model_path

    def model_exists(self) -> bool:
        return os.path.exists(self.model_path)

    def run(self, image_bytes: bytes, image_name: str) -> dict[str, Any]:
        # Deterministic placeholder logic until real inference is plugged in.
        digest = hashlib.sha256(image_bytes + image_name.encode("utf-8")).hexdigest()
        idx_a = int(digest[:2], 16) % len(CHEXBERT_LABEL_SPACE)
        idx_b = int(digest[2:4], 16) % len(CHEXBERT_LABEL_SPACE)

        if idx_a == idx_b:
            idx_b = (idx_b + 3) % len(CHEXBERT_LABEL_SPACE)

        label_a = CHEXBERT_LABEL_SPACE[idx_a]
        label_b = CHEXBERT_LABEL_SPACE[idx_b]

        scores = {
            label_a: round(0.7 + (int(digest[4:6], 16) / 255.0) * 0.2, 3),
            label_b: round(0.55 + (int(digest[6:8], 16) / 255.0) * 0.25, 3),
        }

        return {
            "labels": [label_a, label_b],
            "scores": scores,
            "xai_image_base64": None,
            "xai_method": "Grad-CAM",
        }
