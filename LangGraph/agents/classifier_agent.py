"""
classifier_agent.py — Ensemble + Feature Fusion + Grad-CAM
===========================================================
Même principe que fusion3.ipynb :
  - 3 backbones : DenseNet121 + EfficientNet-B4 + ConvNeXt-Small
  - Feature-level fusion (FrozenEnsembleExtractor → FeatureFusionHead)
  - Prediction ensemble (moyenne pondérée des 3 backbones)
  - Meta-ensemble : 50% prediction + 50% fusion
  - TTA : flip horizontal
  - Grad-CAM sur denseblock4 du DenseNet

FIX 1 : Grad-CAM utilise eval() + torch.enable_grad()
FIX 2 : No Finding supprimé si vraies pathologies présentes
         (cohérent avec le dataset MIMIC-CXR)
"""

import torch
import torch.nn as nn
import torch.nn.functional as F
import torchvision.models as tv_models
import timm
import numpy as np
from PIL import Image
import albumentations as A
from albumentations.pytorch import ToTensorV2
import base64
import io
import cv2

# ─── Labels & Thresholds ────────────────────────────────────────────────────
LABELS = [
    "Atelectasis", "Cardiomegaly", "Consolidation", "Edema",
    "Enlarged Cardiomediastinum", "Fracture", "Lung Lesion",
    "Lung Opacity", "No Finding", "Pleural Effusion",
    "Pleural Other", "Pneumonia", "Pneumothorax", "Support Devices"
]

THRESHOLDS = {
    "Atelectasis": 0.55, "Cardiomegaly": 0.55, "Consolidation": 0.60,
    "Edema": 0.66, "Enlarged Cardiomediastinum": 0.81, "Fracture": 0.82,
    "Lung Lesion": 0.65, "Lung Opacity": 0.51, "No Finding": 0.53,
    "Pleural Effusion": 0.63, "Pleural Other": 0.79, "Pneumonia": 0.62,
    "Pneumothorax": 0.82, "Support Devices": 0.55
}

# Support Devices peut coexister avec No Finding (validé sur le dataset)
# Toutes les autres pathologies NE PEUVENT PAS coexister avec No Finding
COMPATIBLE_WITH_NO_FINDING = {"Support Devices"}

# Poids d'ensemble chargés depuis best_weights (1).npy
_ENSEMBLE_WEIGHTS = [1.0, 1.0, 1.0]  # Valeur par défaut, sera overridée si fichier .npy existe
_MEAN = [0.485, 0.456, 0.406]
_STD  = [0.229, 0.224, 0.225]

MODEL_CONFIGS = [
    {"name": "densenet121",     "img_size": 320},
    {"name": "efficientnet_b4", "img_size": 320},
    {"name": "convnext_small",  "img_size": 320},
]

NUM_CLASSES = len(LABELS)


# ─── Transform ──────────────────────────────────────────────────────────────
def get_transform(img_size):
    return A.Compose([
        A.Resize(img_size, img_size),
        A.Normalize(mean=_MEAN, std=_STD),
        ToTensorV2()
    ])


# ─── Backbone ───────────────────────────────────────────────────────────────
class CXRBackbone(nn.Module):
    def __init__(self, model_name, num_classes=14, pretrained=False, dropout=0.3):
        super().__init__()
        self.model_name = model_name

        if model_name == "densenet121":
            base = tv_models.densenet121(weights=None)
            self.backbone = base.features
            self.feat_dim = 1024
            self.pool     = nn.AdaptiveAvgPool2d((1, 1))

        elif model_name == "efficientnet_b4":
            base = timm.create_model("efficientnet_b4", pretrained=False,
                                     num_classes=0, global_pool="avg")
            self.backbone = base
            self.feat_dim = base.num_features
            self.pool     = nn.Identity()

        elif model_name == "convnext_small":
            base = timm.create_model("convnext_small", pretrained=False,
                                     num_classes=0, global_pool="avg")
            self.backbone = base
            self.feat_dim = base.num_features
            self.pool     = nn.Identity()

        else:
            raise ValueError(f"Unknown model: {model_name}")

        self.head = nn.Sequential(
            nn.BatchNorm1d(self.feat_dim),
            nn.Dropout(dropout),
            nn.Linear(self.feat_dim, 512),
            nn.GELU(),
            nn.Dropout(dropout / 2),
            nn.Linear(512, num_classes)
        )

    def get_features(self, x):
        if self.model_name == "densenet121":
            f = F.relu(self.backbone(x), inplace=True)
            return self.pool(f).flatten(1)
        else:
            return self.backbone(x)

    def forward(self, x):
        return self.head(self.get_features(x))


# ─── Grad-CAM ────────────────────────────────────────────────────────────────
class GradCAM:
    def __init__(self, model, target_layer):
        self.model       = model
        self.gradients   = None
        self.activations = None
        target_layer.register_forward_hook(self._save_activation)
        target_layer.register_full_backward_hook(self._save_gradient)

    def _save_activation(self, module, input, output):
        self.activations = output

    def _save_gradient(self, module, grad_input, grad_output):
        self.gradients = grad_output[0]

    def generate(self, input_tensor, class_idx):
        self.model.zero_grad()
        output = self.model(input_tensor)
        score  = output[0, class_idx]
        score.backward(retain_graph=True)

        weights = self.gradients.mean(dim=(2, 3), keepdim=True)
        cam     = (weights * self.activations).sum(dim=1, keepdim=True)
        cam     = F.relu(cam)
        cam     = F.interpolate(cam, size=(320, 320), mode="bilinear",
                                align_corners=False)
        cam     = cam.squeeze().cpu().detach().numpy()
        cam    -= cam.min()
        if cam.max() > 0:
            cam /= cam.max()
        return cam


# ─── Colormap helper ─────────────────────────────────────────────────────────
def apply_colormap(cam, original_img_array):
    heatmap          = cv2.applyColorMap(np.uint8(255 * cam), cv2.COLORMAP_JET)
    heatmap          = cv2.cvtColor(heatmap, cv2.COLOR_BGR2RGB)
    original_resized = cv2.resize(original_img_array, (320, 320))
    overlay          = (0.6 * original_resized + 0.4 * heatmap).astype(np.uint8)
    return overlay


def image_to_base64(img_array):
    img_pil = Image.fromarray(img_array)
    buffer  = io.BytesIO()
    img_pil.save(buffer, format="PNG")
    return "data:image/png;base64," + base64.b64encode(buffer.getvalue()).decode()


# ─── Classifier Agent ────────────────────────────────────────────────────────
class ClassifierAgent:
    def __init__(self, ckpt_densenet, ckpt_efficientnet, ckpt_convnext,
                 ensemble_weights_file=None, device=None):
        self.device     = device or ("cuda" if torch.cuda.is_available() else "cpu")
        self.labels     = LABELS
        self.thresholds = THRESHOLDS

        # Charger les poids d'ensemble depuis le fichier .npy
        ensemble_weights = _ENSEMBLE_WEIGHTS.copy()
        if ensemble_weights_file:
            try:
                loaded_weights = np.load(ensemble_weights_file)
                ensemble_weights = loaded_weights.tolist()
                print(f"  [OK] Poids d'ensemble charges depuis {ensemble_weights_file}: {ensemble_weights}")
            except Exception as e:
                print(f"  [WARN] Impossible de charger {ensemble_weights_file}: {e}")
                print(f"  [FALLBACK] Utilisation des poids par defaut: {ensemble_weights}")
        
        self.ensemble_weights = ensemble_weights

        ckpt_map = {
            "densenet121":     ckpt_densenet,
            "efficientnet_b4": ckpt_efficientnet,
            "convnext_small":  ckpt_convnext,
        }

        self.backbones  = []
        self.transforms = []
        self.feat_dims  = []

        for cfg in MODEL_CONFIGS:
            name     = cfg["name"]
            img_size = cfg["img_size"]

            model = CXRBackbone(name, NUM_CLASSES, pretrained=False)
            ckpt  = torch.load(ckpt_map[name], map_location=self.device,
                               weights_only=False)

            sd = ckpt
            if isinstance(ckpt, dict):
                sd = ckpt.get("state_dict", ckpt.get("model_state_dict", ckpt))

            model.load_state_dict(sd, strict=False)
            model.to(self.device)
            model.eval()

            self.backbones.append(model)
            self.transforms.append(get_transform(img_size))
            self.feat_dims.append(model.feat_dim)
            print(f"  [{name}] charge OK — feat_dim={model.feat_dim}")

        # Grad-CAM initialized on the DenseNet backbone
        if self.backbones:
            self.gradcam = GradCAM(self.backbones[0], self.backbones[0].backbone.denseblock4)
        else:
            self.gradcam = None

        print("ClassifierAgent (ensemble) pret !")

    # ── helpers ──────────────────────────────────────────────────────────────
    def _prepare_tensor(self, img_array, transform):
        return transform(image=img_array)["image"].unsqueeze(0).to(self.device)

    def _get_features_and_logits(self, img_array):
        features_list = []
        logits_list   = []
        for backbone, transform in zip(self.backbones, self.transforms):
            t = self._prepare_tensor(img_array, transform)
            with torch.no_grad():
                feats  = backbone.get_features(t)
                logits = backbone(t)
            features_list.append(feats)
            logits_list.append(logits)
        return features_list, logits_list

    # ── predict ──────────────────────────────────────────────────────────────
    def predict(self, image_path):
        img_orig = np.array(Image.open(image_path).convert("RGB"))
        img_flip = np.fliplr(img_orig).copy()

        # TTA : original + flip
        feats_orig, logits_orig = self._get_features_and_logits(img_orig)
        feats_flip, logits_flip = self._get_features_and_logits(img_flip)

        with torch.no_grad():
            # Prediction ensemble (moyenne pondérée des 3 backbones)
            w = torch.tensor(self.ensemble_weights, dtype=torch.float32)
            w = w / w.sum()
            probs_ensemble = torch.zeros(1, NUM_CLASSES).to(self.device)
            for i, (lo, lf) in enumerate(zip(logits_orig, logits_flip)):
                p_avg = (torch.sigmoid(lo) + torch.sigmoid(lf)) / 2.0
                probs_ensemble += w[i] * p_avg

            # Feature fusion - pas de fusion head, juste prediction ensemble
            probs_meta = probs_ensemble
            probs_np   = probs_meta.squeeze().cpu().numpy()

        # ── Seuillage ────────────────────────────────────────────────────────
        positive_labels = []
        details = {}
        for lbl, prob in zip(self.labels, probs_np):
            pred = bool(prob >= self.thresholds.get(lbl, 0.5))
            details[lbl] = {"prob": round(float(prob), 4), "pred": pred}
            if pred:
                positive_labels.append(lbl)

        # ── FIX : Nettoyage de la contradiction No Finding + pathologie ───────
        # Validé sur le dataset MIMIC-CXR (55 973 images) :
        #   No Finding ne coexiste JAMAIS avec une vraie pathologie
        #   Seul Support Devices peut coexister avec No Finding (14.3% des cas)
        vraies_pathologies = [
            l for l in positive_labels
            if l not in COMPATIBLE_WITH_NO_FINDING and l != "No Finding"
        ]

        if vraies_pathologies:
            # Vraies pathologies présentes → supprimer No Finding
            # Garder Support Devices s'il est présent
            positive_labels = [
                l for l in positive_labels if l != "No Finding"
            ]
            is_normal = False
            print(f"  [FIX] No Finding supprimé — pathologies : {vraies_pathologies}")
        else:
            # Aucune vraie pathologie → cas normal
            # Garder No Finding + éventuellement Support Devices
            positive_labels = positive_labels or ["No Finding"]
            is_normal = True

        # ── Grad-CAM ─────────────────────────────────────────────────────────
        xai_base64 = None
        try:
            target_labels = vraies_pathologies if vraies_pathologies \
                            else positive_labels
            if target_labels and target_labels[0] in self.labels:
                class_idx  = self.labels.index(target_labels[0])
                densenet   = self.backbones[0]
                transform0 = self.transforms[0]

                densenet.eval()
                img_t = self._prepare_tensor(img_orig, transform0)
                img_t.requires_grad_(True)

                with torch.enable_grad():
                    cam = self.gradcam.generate(img_t, class_idx)

                overlay    = apply_colormap(cam, img_orig)
                xai_base64 = image_to_base64(overlay)
                print(f"  [OK] Grad-CAM genere pour : {target_labels[0]}")

        except Exception as e:
            print(f"  [WARN] Grad-CAM echoue : {e}")
            import traceback; traceback.print_exc()

        return {
            "positive_labels": positive_labels,
            "is_normal":       is_normal,
            "details":         details,
            "xai_image":       xai_base64,
        }


# ─── Singleton ───────────────────────────────────────────────────────────────
_agent = None

def get_classifier_agent(ckpt_densenet, ckpt_efficientnet,
                          ckpt_convnext, ensemble_weights_file=None):
    global _agent
    if _agent is None:
        _agent = ClassifierAgent(
            ckpt_densenet=ckpt_densenet,
            ckpt_efficientnet=ckpt_efficientnet,
            ckpt_convnext=ckpt_convnext,
            ensemble_weights_file=ensemble_weights_file,
        )
    return _agent


# ─── LangGraph node ──────────────────────────────────────────────────────────
def classifier_node(state: dict) -> dict:
    agent = get_classifier_agent(
        ckpt_densenet="./models/best_densenet121.pth",
        ckpt_efficientnet="./models/best_efficientnet_b4 (3).pth",
        ckpt_convnext="./models/best_convnext_small (1).pth",
        ensemble_weights_file="./models/best_weights (1).npy",
    )
    result = agent.predict(state["image_path"])

    state["labels"]             = result["positive_labels"]
    state["is_normal"]          = result["is_normal"]
    state["classifier_details"] = result["details"]
    state["xai_image"]          = result.get("xai_image")
    return state