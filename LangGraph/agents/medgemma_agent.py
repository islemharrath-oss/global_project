"""
medgemma_agent.py - Agent 2 : Clinical Verifier (MedGemma + LoRA)
==================================================================
Role dans le pipeline LangGraph :
  Input  : image X-ray  +  labels CNN extraits par Agent 1 (classifier)
  Task   : Verification clinique sceptique de chaque label CNN contre l'image
  Output : Rapport clinique structure  +  CONFIRMED: [...]  (labels verifies)
"""

import os
import re
import json
import torch
from PIL import Image
from transformers import AutoProcessor, AutoModelForImageTextToText, BitsAndBytesConfig
from peft import PeftModel
from huggingface_hub import login

# --- Constantes ---
CHEXPERT_LABELS = [
    "No Finding", "Enlarged Cardiomediastinum", "Cardiomegaly",
    "Lung Opacity", "Lung Lesion", "Edema", "Consolidation",
    "Pneumonia", "Atelectasis", "Pneumothorax", "Pleural Effusion",
    "Pleural Other", "Fracture", "Support Devices",
]

HF_TOKEN = os.getenv("HF_TOKEN", "")

# Chemin du modele de base MedGemma en cache local
BASE_MEDGEMMA_PATH = r"C:\Users\user\.cache\huggingface\hub\models--google--medgemma-4b-it\snapshots\290cda5eeccbee130f987c4ad74a59ae6f196408"

# --- Singleton model ---
_medgemma_model     = None
_medgemma_processor = None


def _get_device_dtype():
    if torch.cuda.is_available():
        cap = torch.cuda.get_device_capability()[0]
        dtype = torch.bfloat16 if cap >= 8 else torch.float16
        vram_total = torch.cuda.get_device_properties(0).total_memory / 1e9
        vram_free  = (torch.cuda.get_device_properties(0).total_memory
                      - torch.cuda.memory_allocated()) / 1e9
        print(f"[INFO] Device detecte: cuda")
        print(f"[INFO] VRAM totale : {vram_total:.1f} GB")
        print(f"[INFO] VRAM libre  : {vram_free:.1f} GB")
    else:
        dtype = torch.float32
        print("[INFO] Device detecte: cpu")
    return dtype


def get_medgemma_model(model_path: str):
    """
    Charge MedGemma 4-bit depuis le cache local + applique LoRA fine-tune.
    Singleton - charge une seule fois.
    """
    global _medgemma_model, _medgemma_processor

    if _medgemma_model is not None:
        return _medgemma_model, _medgemma_processor

    # HuggingFace login
    if HF_TOKEN:
        try:
            login(token=HF_TOKEN, add_to_git_credential=False)
            print("[OK] HuggingFace login reussi!")
        except Exception as e:
            print(f"[WARN] HuggingFace login: {e}")

    dtype = _get_device_dtype()

    # -- Processor depuis le cache local --
    print("[...] Chargement du processor MedGemma...")
    _medgemma_processor = AutoProcessor.from_pretrained(
        BASE_MEDGEMMA_PATH,
        local_files_only=True
    )
    _medgemma_processor.tokenizer.padding_side = "right"
    print("[OK] Processor charge!")

    # -- Modele de base 4-bit depuis le cache local --
    print("[...] Chargement du modele de base MedGemma (4-bit, shard par shard)...")
    bnb_config = BitsAndBytesConfig(
        load_in_4bit=True,
        bnb_4bit_use_double_quant=True,
        bnb_4bit_quant_type="nf4",
        bnb_4bit_compute_dtype=dtype,
        bnb_4bit_quant_storage=dtype,
    )
    base_model = AutoModelForImageTextToText.from_pretrained(
        BASE_MEDGEMMA_PATH,
        local_files_only=True,
        attn_implementation="eager",
        torch_dtype=dtype,
        device_map="auto",
        quantization_config=bnb_config,
    )
    print("[OK] Modele de base charge avec succes!")

    # -- LoRA fine-tune depuis le dossier local --
    print("[...] Application des poids LoRA fine-tunes...")
    _medgemma_model = PeftModel.from_pretrained(base_model, model_path)
    _medgemma_model.eval()
    print("[OK] MedGemma + LoRA charge avec succes!")

    if torch.cuda.is_available():
        vram_used = torch.cuda.memory_allocated() / 1e9
        print(f"[INFO] VRAM utilisee apres chargement: {vram_used:.1f} GB")

    return _medgemma_model, _medgemma_processor


# --- Helpers prompt / parsing ---
def _format_labels(labels: list) -> str:
    return str(labels)


def _build_agent2_prompt(cnn_labels: list,
                          procedure: str = "CHEST X-RAY",
                          view: str = "PA") -> str:
    """
    Prompt Agent 2 - exactement comme dans le notebook (Cell 10).
    """
    cnn_label_str = _format_labels(cnn_labels)
    return f"""You are a senior radiologist acting as a clinical verification agent.

TASK: You have received the following chest X-ray image along with CNN-predicted labels from an automated classifier (Agent 1). Your job is to critically verify each label by carefully examining the image yourself. Be skeptical - the CNN can be wrong.

--- AGENT 1 CNN OUTPUT ---
Procedure : {procedure}
View      : {view}
Predicted labels: {cnn_label_str}
-------------------------

Instructions:
1. Examine the image independently and thoroughly.
2. For each CNN-predicted label, explicitly state whether you CONFIRM or REJECT it based on visual evidence.
3. Note any findings the CNN missed.
4. Write a concise, dry clinical FINDINGS section and a one-line IMPRESSION.
5. End your response with EXACTLY this format on the last line:
   CONFIRMED: ['Label1', 'Label2']
   List only the conditions you have visually confirmed. Use 'No Finding' if none are confirmed."""


def extract_confirmed_labels(generated_text: str) -> list:
    """
    Parse la ligne CONFIRMED: [...] depuis la sortie de MedGemma.
    Reproduit exactement la fonction du notebook (Cell 18).
    """
    match = re.search(r"CONFIRMED:\s*(\[.*?\])", generated_text, re.IGNORECASE)
    if match:
        try:
            return json.loads(match.group(1).replace("'", '"'))
        except Exception:
            pass
    return []


def _parse_report_sections(full_text: str) -> dict:
    """
    Extrait FINDINGS, IMPRESSION et CONFIRMED depuis le texte genere.
    Tronque apres le premier CONFIRMED pour eviter les repetitions.
    """
    # Recupere uniquement la partie assistant
    if "assistant" in full_text.lower():
        report_text = full_text.split("assistant")[-1].strip()
    elif "model" in full_text.lower():
        report_text = full_text.split("model")[-1].strip()
    else:
        report_text = full_text.strip()

    # ── IMPORTANT : tronquer apres le premier CONFIRMED: [...] ──────────
    # Evite la repetition en boucle que MedGemma peut generer
    import re as _re
    confirmed_match = _re.search(r"CONFIRMED:\s*\[.*?\]", report_text, _re.IGNORECASE)
    if confirmed_match:
        # Garde uniquement jusqu'a la fin du premier CONFIRMED
        report_text = report_text[:confirmed_match.end()].strip()

    findings   = ""
    impression = ""

    if "FINDINGS:" in report_text:
        parts = report_text.split("FINDINGS:")
        rest  = parts[1] if len(parts) > 1 else ""
        if "IMPRESSION:" in rest:
            findings = rest.split("IMPRESSION:")[0].strip()
        else:
            findings = rest.strip()

    if "IMPRESSION:" in report_text:
        imp_part   = report_text.split("IMPRESSION:")[1]
        impression = imp_part.split("\n")[0].strip()

    confirmed = extract_confirmed_labels(report_text)

    return {
        "full_report":      report_text,
        "findings":         findings,
        "impression":       impression,
        "confirmed_labels": confirmed,
    }


# --- Fonction principale d'inference ---
def run_medgemma(image_path: str,
                 cnn_labels: list,
                 model_path: str,
                 procedure: str = "CHEST X-RAY",
                 view: str = "PA",
                 max_new_tokens: int = 512) -> dict:
    """
    Lance l'inference MedGemma Agent 2.

    Args:
        image_path    : chemin vers l'image X-ray
        cnn_labels    : labels predits par Agent 1 (classifier)
        model_path    : chemin vers le dossier LoRA fine-tune
        procedure     : type d'examen (defaut: CHEST X-RAY)
        view          : position de vue (defaut: PA)
        max_new_tokens: tokens max a generer

    Returns:
        dict avec :
          - full_report      : rapport complet genere
          - findings         : section FINDINGS extraite
          - impression       : section IMPRESSION extraite
          - confirmed_labels : liste de labels confirmes
    """
    model, processor = get_medgemma_model(model_path)

    image  = Image.open(image_path).convert("RGB")
    prompt = _build_agent2_prompt(cnn_labels, procedure, view)

    messages = [
        {
            "role": "user",
            "content": [
                {"type": "image"},
                {"type": "text", "text": prompt},
            ],
        }
    ]

    text   = processor.apply_chat_template(
        messages, tokenize=False, add_generation_prompt=True
    )
    inputs = processor(images=image, text=text, return_tensors="pt")
    inputs = {k: v.to(model.device) for k, v in inputs.items()}

    n_input_tokens = inputs["input_ids"].shape[-1]
    print(f"[INFO] Generation du rapport... ({n_input_tokens} tokens en entree)")

    with torch.no_grad():
        output = model.generate(
            **inputs,
            max_new_tokens=max_new_tokens,
            do_sample=False,
            num_beams=1,
            repetition_penalty=1.1,
            pad_token_id=processor.tokenizer.pad_token_id,
            eos_token_id=processor.tokenizer.eos_token_id,
            use_cache=True,
        )

    generated_text = processor.decode(output[0], skip_special_tokens=True)
    del output
    if torch.cuda.is_available():
        torch.cuda.empty_cache()

    result    = _parse_report_sections(generated_text)
    confirmed = result["confirmed_labels"]
    n_chars   = len(result["full_report"])
    print(f"[OK] Rapport MedGemma genere ({n_chars} caracteres)")
    print(f"[OK] Labels confirmes : {confirmed}")

    return result


# --- LangGraph node ---
def medgemma_node(state: dict) -> dict:
    """
    Noeud LangGraph Agent 2.

    Lit depuis state :
      - image_path         : chemin image X-ray
      - labels             : labels CNN Agent 1
      - model_medgemma     : chemin dossier LoRA fine-tune

    Ecrit dans state :
      - medical_report     : rapport complet genere par MedGemma
      - confirmed_labels   : labels confirmes (CONFIRMED: [...])
      - report_for_chexbert: texte passe a l'agent CheXbert
    """
    image_path  = state["image_path"]
    cnn_labels  = state.get("labels", [])
    model_path  = state.get("model_medgemma", "./models/medgemma-mimic-lora-final")

    valid_labels = [l for l in cnn_labels if l in CHEXPERT_LABELS]
    if not valid_labels:
        valid_labels = ["No Finding"]

    result = run_medgemma(
        image_path=image_path,
        cnn_labels=valid_labels,
        model_path=model_path,
    )

    state["medical_report"]      = result["full_report"]
    state["confirmed_labels"]    = result["confirmed_labels"] or valid_labels
    state["report_for_chexbert"] = result["full_report"]

    return state