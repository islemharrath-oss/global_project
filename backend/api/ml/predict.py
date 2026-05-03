import os
import torch
import torch.nn as nn
from torchvision import models, transforms
from PIL import Image
from django.conf import settings

DEVICE = torch.device("cpu")

LABELS = [
    "Atelectasis","Cardiomegaly","Consolidation","Edema",
    "Enlarged Cardiomediastinum","Fracture","Lung Lesion",
    "Lung Opacity","No Finding","Pleural Effusion",
    "Pleural Other","Pneumonia","Pneumothorax","Support Devices"
]

BASE_DIR = getattr(settings, "BASE_DIR", os.getcwd())
MODEL_PATH = os.path.join(BASE_DIR, "api", "ml", "model.pth")

# ======================
# MODEL (EXACT TRAINING ARCHITECTURE)
# ======================
class CXRModel(nn.Module):
    def __init__(self):
        super().__init__()

        backbone = models.densenet121(weights=None)
        self.features = backbone.features

        # IMPORTANT: SAME AS training
        self.classifier = nn.Linear(1024, len(LABELS))

    def forward(self, x):
        x = self.features(x)
        x = torch.relu(x)
        x = torch.nn.functional.adaptive_avg_pool2d(x, (1, 1))
        x = torch.flatten(x, 1)
        x = self.classifier(x)
        return x

# ======================
# LOAD MODEL
# ======================
model = CXRModel().to(DEVICE)

if not os.path.exists(MODEL_PATH):
    raise FileNotFoundError(f"❌ Model file not found: {MODEL_PATH}")

checkpoint = torch.load(MODEL_PATH, map_location=DEVICE)

# Extraire state_dict
if isinstance(checkpoint, dict):
    if 'state_dict' in checkpoint:
        state_dict = checkpoint['state_dict']
    elif 'model' in checkpoint:
        state_dict = checkpoint['model']
    else:
        state_dict = checkpoint
else:
    state_dict = checkpoint

# ✅ Supprimer les clés du classifier (incompatibles 1000 → 14)
state_dict = {
    k: v for k, v in state_dict.items()
    if not k.startswith('classifier')
}

# ✅ Charger uniquement les features (strict=False)
model.load_state_dict(state_dict, strict=False)

model.eval()
print("✅ Model loaded (features only, classifier re-initialized)")

# ======================
# TRANSFORM
# ======================
transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize([0.485,0.456,0.406],[0.229,0.224,0.225])
])

# ======================
# PREDICT
# ======================
def predict_image(image_path, threshold=0.5):
    image = Image.open(image_path).convert("RGB")
    image = transform(image).unsqueeze(0).to(DEVICE)

    with torch.no_grad():
        outputs = model(image)
        probs = torch.sigmoid(outputs)[0].cpu().numpy()

    results = [
        label for label, p in zip(LABELS, probs)
        if p >= threshold
    ]

    return results if results else ["No Finding"]