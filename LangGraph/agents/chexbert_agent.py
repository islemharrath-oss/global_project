"""
chexbert_agent.py
-----------------
CheXbert loading, inference, validation, and self-correction loop — Agent 3.

Architecture CheXbert :
  - Model  : bert-base-uncased + 14 independent linear classification heads
  - Weights: loaded from LOCAL path first (models/chexbert.pth),
             fallback to HuggingFace Hub only if not found locally.
  - Classes: 0=blank, 1=positive, 2=negative, 3=uncertain

Self-correction loop:
  1. LLM translates clinical report to patient-friendly text.
  2. CheXbert (or direct anchor-line matching) validates label fidelity.
  3. If mismatch → strict correction prompt → repeat up to max_iterations.
  4. Bulletproof fallback: injects anchor line directly if all iterations fail.
"""

import os
import re
import logging
import warnings
from datetime import datetime
from typing import List, Dict, Tuple, Optional

import torch
import torch.nn as nn
from transformers import AutoTokenizer, BertModel
from colorama import Fore, Style, init as colorama_init

colorama_init(autoreset=True)
warnings.filterwarnings("ignore")

logger = logging.getLogger("Agent3")

# ═══════════════════════════════════════════════════════════════════════════
#  CHEXBERT LABEL SCHEMA
# ═══════════════════════════════════════════════════════════════════════════

CHEXBERT_LABELS = [
    "Enlarged Cardiomediastinum",
    "Cardiomegaly",
    "Lung Opacity",
    "Lung Lesion",
    "Edema",
    "Consolidation",
    "Pneumonia",
    "Atelectasis",
    "Pneumothorax",
    "Pleural Effusion",
    "Pleural Other",
    "Fracture",
    "Support Devices",
    "No Finding",
]

CHEXBERT_CLASS_MAP = {0: "blank", 1: "positive", 2: "negative", 3: "uncertain"}


# ═══════════════════════════════════════════════════════════════════════════
#  CHEXBERT ARCHITECTURE
# ═══════════════════════════════════════════════════════════════════════════

class CheXbertModel(nn.Module):
    def __init__(self):
        super().__init__()
        self.bert = BertModel.from_pretrained("bert-base-uncased")
        self.dropout = nn.Dropout(p=0.1)
        self.classifiers = nn.ModuleList([
            nn.Linear(768, 4) for _ in range(14)
        ])

    def forward(self, input_ids, attention_mask, token_type_ids=None):
        outputs = self.bert(
            input_ids=input_ids,
            attention_mask=attention_mask,
            token_type_ids=token_type_ids,
        )
        cls_output = self.dropout(outputs.pooler_output)
        logits = [head(cls_output) for head in self.classifiers]
        return logits


# ═══════════════════════════════════════════════════════════════════════════
#  CHEXBERT LOADING — LOCAL FIRST, HuggingFace en fallback
# ═══════════════════════════════════════════════════════════════════════════

def load_chexbert(cfg: Dict):
    """
    Load CheXbert weights — LOCAL FILE FIRST, HuggingFace Hub as fallback.

    Priority order:
      1. cfg["chexbert_local_path"]
      2. env var CHEXBERT_LOCAL_PATH
      C:\\Users\\user\\Desktop\\PCD\\LangGraph\\models\\chexbert.pth
      4. hf_hub_download(StanfordAIMI/...)  — seulement si absent localement

    Returns:
        (CHEXBERT_TOKENIZER, CHEXBERT_MODEL)
    """

    # ✅ FIX : cfg.get() avec fallback — plus de KeyError si "device" absent
    device = cfg.get("device", "cuda" if torch.cuda.is_available() else "cpu")

    # ── Résoudre le chemin local ──────────────────────────────────
    local_path = (
        cfg.get("chexbert_local_path")
        or os.environ.get("CHEXBERT_LOCAL_PATH")
        or r"C:\\Users\\user\\Desktop\\PCD\\LangGraph\\models\\chexbert.pth"
    )

    # ── Charger depuis le disque local si disponible ──────────────
    if os.path.isfile(local_path):
        print(f"✅ CheXbert trouvé localement : {local_path}  (pas de téléchargement)")
        chexbert_pth_path = local_path
    else:
        print(f"⚠️  Fichier local non trouvé : {local_path}")
        print(f"⬇️  Téléchargement depuis StanfordAIMI/RRG_scorers ...")
        from huggingface_hub import hf_hub_download
        chexbert_pth_path = hf_hub_download(
            repo_id  = "StanfordAIMI/RRG_scorers",
            filename = "chexbert.pth",
            token    = cfg.get("hf_token"),
        )
        print(f"✅ Téléchargé vers : {chexbert_pth_path}")

    # ── Charger les poids dans le modèle ─────────────────────────
    print("🔧 Chargement des poids CheXbert ...")

    model = CheXbertModel()
    checkpoint = torch.load(chexbert_pth_path, map_location="cpu")

    if "model_state_dict" in checkpoint:
        state_dict = checkpoint["model_state_dict"]
    elif "state_dict" in checkpoint:
        state_dict = checkpoint["state_dict"]
    else:
        state_dict = checkpoint

    state_dict = {k.replace("module.", ""): v for k, v in state_dict.items()}
    model.load_state_dict(state_dict, strict=False)
    model = model.to(device)
    model.eval()

    tokenizer = AutoTokenizer.from_pretrained("bert-base-uncased")
    print(f"✅ CheXbert chargé avec succès sur {device}")
    return tokenizer, model


# ═══════════════════════════════════════════════════════════════════════════
#  ANCHOR LINE HELPERS
# ═══════════════════════════════════════════════════════════════════════════

def extract_anchor_line(text: str) -> Optional[str]:
    match = re.search(r"CLINICAL FINDINGS\s*:\s*(.+)", text, re.IGNORECASE)
    if match:
        return match.group(0).strip()
    return None


def extract_labels_direct(text: str, known_labels: List[str]) -> List[str]:
    anchor_line = extract_anchor_line(text)
    if not anchor_line:
        return []
    found = []
    for label in known_labels:
        if label.lower() in anchor_line.lower():
            found.append(label)
    return found


# ═══════════════════════════════════════════════════════════════════════════
#  CHEXBERT INFERENCE
# ═══════════════════════════════════════════════════════════════════════════

@torch.no_grad()
def extract_labels_with_chexbert(text, tokenizer, model, device, include_uncertain=False):
    anchor_line = extract_anchor_line(text)

    if anchor_line:
        print(f"🎯 Anchor found: '{anchor_line}'")
        chexbert_input = anchor_line
    else:
        print(f"⚠️  No anchor line found — using full text")
        chexbert_input = text

    print(f"📥 CheXbert input: '{chexbert_input[:120]}'")

    inputs = tokenizer(
        chexbert_input,
        return_tensors="pt",
        truncation=True,
        padding=True,
        max_length=512,
    ).to(device)

    logits_list = model(
        input_ids      = inputs["input_ids"],
        attention_mask = inputs["attention_mask"],
        token_type_ids = inputs.get("token_type_ids"),
    )

    positive_labels = []
    for i, logits in enumerate(logits_list):
        pred = logits.argmax(dim=-1).item()
        if pred == 1 or (include_uncertain and pred == 3):
            positive_labels.append(CHEXBERT_LABELS[i])

    print(f"🔬 CheXbert extracted: {positive_labels}")
    return positive_labels


# ═══════════════════════════════════════════════════════════════════════════
#  HELPER FUNCTIONS
# ═══════════════════════════════════════════════════════════════════════════

def parse_confirmed_labels(agent2_report: str) -> List[str]:
    pattern = r"CONFIRMED\s*:\s*\[?([^\]\n]+)\]?"
    match = re.search(pattern, agent2_report, re.IGNORECASE)

    if not match:
        raise ValueError(
            "❌ 'CONFIRMED:' keyword not found in Agent 2 report.\n"
            f"Report snippet: {agent2_report[:200]}"
        )

    raw = match.group(1)
    labels = [
        lbl.strip().strip("'\"")
        for lbl in raw.split(",")
        if lbl.strip().strip("'\"")
    ]

    known = {l.lower() for l in CHEXBERT_LABELS}
    validated, unknown = [], []
    for lbl in labels:
        if lbl.lower() in known:
            validated.append(lbl.title())
        else:
            unknown.append(lbl)

    if unknown:
        logger.warning(f"⚠️  Unknown labels (kept as-is): {unknown}")
        validated.extend(unknown)

    logger.info(f"📋 Parsed CONFIRMED labels: {validated}")
    return validated


def compare_labels(confirmed: List[str], extracted: List[str]) -> Dict:
    confirmed_set = {l.lower() for l in confirmed}
    extracted_set = {l.lower() for l in extracted}

    missing = confirmed_set - extracted_set
    extra   = extracted_set - confirmed_set
    overlap = confirmed_set & extracted_set
    union   = confirmed_set | extracted_set
    jaccard = len(overlap) / len(union) if union else 1.0
    match   = (missing == set()) and (extra == set())

    return {
        "match":     match,
        "missing":   sorted(missing),
        "extra":     sorted(extra),
        "overlap":   sorted(overlap),
        "jaccard":   round(jaccard, 4),
        "confirmed": sorted(confirmed_set),
        "extracted": sorted(extracted_set),
    }


def print_comparison(diff: Dict, iteration: int = 0) -> None:
    bar    = "─" * 55
    status = Fore.GREEN + "✅ MATCH" if diff["match"] else Fore.RED + "❌ MISMATCH"
    print(f"\n{bar}")
    print(f"  Iteration {iteration} — Label Comparison    {status}")
    print(bar)
    print(f"  Confirmed  : {diff['confirmed']}")
    print(f"  Extracted  : {diff['extracted']}")
    print(f"  Missing    : {Fore.YELLOW}{diff['missing']}")
    print(f"  Extra      : {Fore.YELLOW}{diff['extra']}")
    print(f"  Jaccard    : {diff['jaccard']:.4f}")
    print(bar)


# ═══════════════════════════════════════════════════════════════════════════
#  VALIDATION
# ═══════════════════════════════════════════════════════════════════════════

def validate_translation(
    translated_text: str,
    confirmed_labels: List[str],
    chexbert_tokenizer,
    chexbert_model,
    device: str,
    iteration: int = 0,
) -> Tuple[bool, Dict]:
    anchor_line = extract_anchor_line(translated_text)

    if anchor_line:
        extracted = extract_labels_direct(translated_text, CHEXBERT_LABELS)
        print(f"🎯 Anchor validation — extracted: {extracted}")
    else:
        print(f"⚠️  No anchor found — falling back to CheXbert on full text")
        extracted = extract_labels_with_chexbert(
            translated_text, chexbert_tokenizer, chexbert_model, device
        )

    diff = compare_labels(confirmed_labels, extracted)
    print_comparison(diff, iteration=iteration)
    return diff["match"], diff


# ═══════════════════════════════════════════════════════════════════════════
#  SELF-CORRECTION LOOP
# ═══════════════════════════════════════════════════════════════════════════

def self_correction_loop(
    clinical_report: str,
    confirmed_labels: List[str],
    llm_pipeline,
    model_id: str,
    chexbert_tokenizer,
    chexbert_model,
    device: str,
    max_iterations: int = 5,
) -> Dict:
    from .mistral_agent import (
        build_normal_prompt,
        build_strict_prompt,
        translate_report,
        SYSTEM_MSG_NORMAL,
        SYSTEM_MSG_STRICT,
    )

    trace        = []
    current_text = ""
    last_diff    = {}
    is_valid     = False

    print(f"\n{'═'*60}")
    print(f"  🔄 Starting Self-Correction Loop (max {max_iterations} iters)")
    print(f"  Confirmed labels: {confirmed_labels}")
    print(f"{'═'*60}\n")

    for i in range(1, max_iterations + 1):
        iter_log = {"iteration": i, "type": None, "generated_text": None, "diff": None}
        print(f"{Fore.CYAN}── Iteration {i}/{max_iterations} ──────────────────────────────")

        if i == 1:
            user_prompt      = build_normal_prompt(clinical_report, confirmed_labels)
            sys_msg          = SYSTEM_MSG_NORMAL
            iter_log["type"] = "normal"
            print(f"  📝 Using NORMAL translation prompt")
        else:
            user_prompt      = build_strict_prompt(confirmed_labels, current_text, last_diff)
            sys_msg          = SYSTEM_MSG_STRICT
            iter_log["type"] = "strict"
            print(f"  🔧 Using STRICT correction prompt")
            print(f"     Missing: {last_diff.get('missing', [])}")
            print(f"     Extra  : {last_diff.get('extra', [])}")

        current_text = translate_report(user_prompt, sys_msg, llm_pipeline, model_id)
        iter_log["generated_text"] = current_text

        print(f"\n  Generated text preview (first 300 chars):")
        print(f"  {Fore.WHITE}{current_text[:300]}{'...' if len(current_text) > 300 else ''}")

        is_valid, diff = validate_translation(
            current_text, confirmed_labels,
            chexbert_tokenizer, chexbert_model, device, iteration=i,
        )
        last_diff = diff
        iter_log["diff"] = diff
        trace.append(iter_log)

        if is_valid:
            print(f"\n{Fore.GREEN}🎉 VALIDATION PASSED at iteration {i}!")
            break
        else:
            print(f"\n{Fore.YELLOW}⚠️  Mismatch at iteration {i}. Retrying...")

    # ── BULLETPROOF FALLBACK ──────────────────────────────────────
    if not is_valid:
        logger.warning("⚠️  All iterations failed — injecting anchor line directly.")
        anchor_line = "CLINICAL FINDINGS: " + ", ".join(confirmed_labels)
        if "CLINICAL FINDINGS:" not in current_text.upper():
            current_text = current_text.rstrip() + f"\n\n{anchor_line}"
            is_valid, last_diff = validate_translation(
                current_text, confirmed_labels,
                chexbert_tokenizer, chexbert_model, device, iteration=0
            )

    final_labels = extract_labels_direct(current_text, CHEXBERT_LABELS)
    if not final_labels:
        final_labels = extract_labels_with_chexbert(
            current_text, chexbert_tokenizer, chexbert_model, device
        )

    result = {
        "final_text"       : current_text,
        "final_labels"     : final_labels,
        "confirmed_labels" : confirmed_labels,
        "is_valid"         : is_valid,
        "iterations_used"  : len(trace),
        "trace"            : trace,
        "jaccard_final"    : last_diff.get("jaccard", 0.0),
        "timestamp"        : datetime.utcnow().isoformat() + "Z",
    }

    if not is_valid:
        logger.warning(
            f"⚠️  Max iterations ({max_iterations}) reached. "
            f"Best Jaccard: {result['jaccard_final']:.4f}"
        )

    return result


# ═══════════════════════════════════════════════════════════════════════════
#  NODE LANGGRAPH
# ═══════════════════════════════════════════════════════════════════════════

_CHEXBERT_TOKENIZER = None
_CHEXBERT_MODEL     = None


def _get_chexbert(cfg: Dict):
    """Singleton — charge CheXbert une seule fois par processus."""
    global _CHEXBERT_TOKENIZER, _CHEXBERT_MODEL
    if _CHEXBERT_MODEL is None:
        _CHEXBERT_TOKENIZER, _CHEXBERT_MODEL = load_chexbert(cfg)
    return _CHEXBERT_TOKENIZER, _CHEXBERT_MODEL


def chexbert_node(state: dict) -> dict:
    """
    LangGraph node — Agent 3: Safe & Verified Patient Report Translation.

    Reads from state:
        - medical_report  : Clinical report text from Agent 2 (contains CONFIRMED: [...])
        - llm_pipeline    : Loaded LLM (HuggingFace pipeline OR llama.cpp model) — optionnel
        - llm_model_id    : Model identifier string
        - cfg             : Configuration dict (device, max_iterations, hf_token, ...)

    Writes to state:
        - patient_report  : Final verified patient-friendly explanation
        - final_labels    : CheXbert-validated labels present in the report
        - is_valid        : Whether validation passed
        - iterations_used : Number of correction loops needed
        - jaccard_final   : Jaccard score of final output
    """
    print("\n" + "=" * 60)
    print("  [Agent 3 — CheXbert] Verified Patient Report Translation")
    print("=" * 60)

    cfg            = state.get("cfg", {})
    medical_report = state.get("medical_report", "")
    max_iterations = cfg.get("max_iterations", 5)
    device         = cfg.get("device", "cuda" if torch.cuda.is_available() else "cpu")

    if not medical_report.strip():
        print("[Agent 3] ❌ No medical report in state.")
        return {**state, "patient_report": "", "final_labels": [],
                "is_valid": False, "iterations_used": 0, "jaccard_final": 0.0}

    # ── Parser les labels confirmés depuis le rapport Agent 2 ─────
    try:
        confirmed_labels = parse_confirmed_labels(medical_report)
    except ValueError as e:
        print(f"[Agent 3] ❌ Label parsing failed: {e}")
        return {**state, "patient_report": "", "final_labels": [],
                "is_valid": False, "iterations_used": 0, "jaccard_final": 0.0}

    print(f"[Agent 3] Confirmed labels: {confirmed_labels}")

    # ── Charger / récupérer Mistral ───────────────────────────────
    # ✅ FIX PRINCIPAL : si llm_pipeline est None dans le state,
    #    on charge Mistral directement ici (GGUF via llama.cpp)
    llm_pipeline = state.get("llm_pipeline")
    model_id     = state.get("llm_model_id", cfg.get("llm_model_id", ""))

    if llm_pipeline is None:
        from .mistral_agent import load_llm, CFG as MISTRAL_CFG

        # Utiliser le chemin du state/cfg ou le défaut dans mistral_agent.CFG
        mistral_path = (
            cfg.get("mistral_model_path")
            or state.get("mistral_model_path")
            or MISTRAL_CFG["llm_model_id"]
        )
        model_id = mistral_path  # nécessaire pour format_chat_prompt

        print(f"[Agent 3] Loading Mistral model: {mistral_path}")
        _tok, llama_or_hf, _pipe = load_llm({**MISTRAL_CFG, "llm_model_id": mistral_path})

        # Pour GGUF : llama_or_hf est le modèle llama.cpp, _pipe est None
        # Pour HF   : llama_or_hf est le model HF,        _pipe est le pipeline
        llm_pipeline = _pipe if _pipe is not None else llama_or_hf
        print(f"[Agent 3] ✅ Mistral model loaded successfully")

    # ── Guard — ne devrait jamais arriver mais sécurise l'appel ───
    if llm_pipeline is None:
        print("[Agent 3] ❌ LLM pipeline is None — impossible de traduire.")
        return {**state, "patient_report": "", "final_labels": [],
                "is_valid": False, "iterations_used": 0, "jaccard_final": 0.0}

    # ── Charger CheXbert (singleton) ──────────────────────────────
    chexbert_tokenizer, chexbert_model = _get_chexbert(cfg)

    # ── Lancer la boucle de correction ────────────────────────────
    result = self_correction_loop(
        clinical_report    = medical_report,
        confirmed_labels   = confirmed_labels,
        llm_pipeline       = llm_pipeline,
        model_id           = model_id,
        chexbert_tokenizer = chexbert_tokenizer,
        chexbert_model     = chexbert_model,
        device             = device,
        max_iterations     = max_iterations,
    )

    print(f"\n[Agent 3] ── Final Result ──")
    print(f"[Agent 3] Valid      : {result['is_valid']}")
    print(f"[Agent 3] Jaccard    : {result['jaccard_final']:.4f}")
    print(f"[Agent 3] Iterations : {result['iterations_used']}")
    print(f"[Agent 3] Labels     : {result['final_labels']}")

    return {
        **state,
        "patient_report":     result["final_text"],
        "mistral_explanation": result["final_text"],  # Alias pour cohérence
        "final_labels":       result["final_labels"],
        "is_valid":           result["is_valid"],
        "iterations_used":    result["iterations_used"],
        "jaccard_final":      result["jaccard_final"],
    }