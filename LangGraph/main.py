# LangGraph/main.py
import json
import os
from graph.pipeline import pipeline

# ── Chemins des modèles ─────────────────────────────────────────────────────
MEDGEMMA_MODEL_PATH = os.getenv("MEDGEMMA_MODEL_PATH", "./models/medgemma-mimic-lora-final")
MISTRAL_MODEL_PATH  = os.getenv("MISTRAL_MODEL_PATH",  r"C:\Users\amine\Desktop\PCD\global_project\LangGraph\models\mistral\mistral-7b-instruct-v0.1.Q4_K_M.gguf")


def run_pipeline(image_path: str) -> dict:

    initial_state = {
        "image_path":                   image_path,
        "model_medgemma":               MEDGEMMA_MODEL_PATH,
        "model_mistral":                MISTRAL_MODEL_PATH,
        # Champs remplis par les agents
        "labels":                       None,
        "is_normal":                    None,
        "classifier_details":           None,
        "xai_image":                    None,
        "medical_report":               None,
        "confirmed_labels":             None,
        "mistral_explanation":          None,
        "report_for_chexbert":          None,
        "final_labels":                 None,
        "chexbert_details":             None,
        "extra_labels_not_validated":   None,   # labels hors-schéma CheXbert (ex: Nodule)
    }

    print(f"\n{'='*50}")
    print(f"  PIPELINE MEDICAL MULTI-AGENT (Ensemble)")
    print(f"{'='*50}")
    print(f"  Image            : {image_path}")
    print(f"  Classifier       : best_densenet, best_efficientnet, best_convnext, best_weights")
    print(f"  MedGemma LoRA    : {MEDGEMMA_MODEL_PATH}")
    print(f"  Mistral          : {MISTRAL_MODEL_PATH}")
    print(f"{'='*50}\n")

    result = pipeline.invoke(initial_state)

    # ── Labels hors-schéma CheXbert (ex: Nodule, Mass…) ───────────────────
    extra_labels = result.get("extra_labels_not_validated") or []

    print("\n Pipeline termine !")
    print(f"Labels classifier          : {result.get('labels')}")
    print(f"Labels confirmes           : {result.get('confirmed_labels')}")
    print(f"Cas normal                 : {result.get('is_normal')}")
    print(f"Labels CheXbert valides    : {result.get('final_labels')}")
    print(f"Labels hors-schema         : {extra_labels if extra_labels else 'aucun'}")
    print(f"XAI image                  : {'OK' if result.get('xai_image') else 'None'}")
    print(f"Explication Mistral        : {'OK' if result.get('mistral_explanation') else 'None'}")

    return {
        # ── Agent 1 : Classifier (fusion) ───────────────────────────────
        "image":                        result.get("image_path"),
        "classifier_labels":            result.get("labels"),
        "is_normal":                    result.get("is_normal"),
        "classifier_details":           result.get("classifier_details", {}),
        "confidence_score":             result.get("confidence_score", 0),

        # ── Agent 2 : MedGemma ──────────────────────────────────────────
        "confirmed_labels":             result.get("confirmed_labels"),
        "medical_report":               result.get("medical_report", ""),

        # ── Agent 4 : Mistral ↔ CheXbert ────────────────────────────────
        "mistral_explanation":          result.get("mistral_explanation", ""),
        "final_labels":                 result.get("final_labels"),
        "chexbert_details":             result.get("chexbert_details", {}),
        "extra_labels_not_validated":   extra_labels,

        # ── XAI : Grad-CAM ───────────────────────────────────────────────
        "xai_image":                    result.get("xai_image", ""),
    }


if __name__ == "__main__":
    import sys
    import base64
    from pathlib import Path
    
    if len(sys.argv) < 2:
        print("Usage : python main.py <chemin_image>")
        sys.exit(1)

    image_path = sys.argv[1]
    result = run_pipeline(image_path)

    # ── Extraction et sauvegarde de l'image XAI ──────────────────────────
    xai_base64 = result.get("xai_image", "")
    if xai_base64 and xai_base64.startswith("data:image/png;base64,"):
        # Extraire les données base64
        base64_data = xai_base64.replace("data:image/png;base64,", "")
        image_bytes = base64.b64decode(base64_data)
        
        # Sauvegarder en PNG
        xai_filename = "xai_gradcam.png"
        with open(xai_filename, "wb") as f:
            f.write(image_bytes)
        print(f"✅ Image Grad-CAM sauvegardée : {xai_filename}")
    
    # Sauvegarde sans xai_image (trop grand pour le JSON)
    result_json = {k: v for k, v in result.items() if k != "xai_image"}
    with open("result.json", "w", encoding="utf-8") as f:
        json.dump(result_json, f, indent=2, ensure_ascii=False)

    print("\n Resultat sauvegarde dans result.json")
    print(f" xai_image : {'OK (' + str(len(result.get('xai_image', ''))) + ' chars)' if result.get('xai_image') else 'None'}")