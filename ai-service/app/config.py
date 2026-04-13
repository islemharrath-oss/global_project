import os

MODEL_ROOT = os.getenv("MODEL_ROOT", "/models")
CNN_MODEL_PATH = os.getenv("CNN_MODEL_PATH", f"{MODEL_ROOT}/cnn")
MEDGEMMA_MODEL_PATH = os.getenv("MEDGEMMA_MODEL_PATH", f"{MODEL_ROOT}/medgemma")
CHEXBERT_MODEL_PATH = os.getenv("CHEXBERT_MODEL_PATH", f"{MODEL_ROOT}/chexbert")

QUALITY_THRESHOLD = float(os.getenv("QUALITY_THRESHOLD", "0.7"))
MAX_REGEN_ATTEMPTS = int(os.getenv("MAX_REGEN_ATTEMPTS", "3"))
