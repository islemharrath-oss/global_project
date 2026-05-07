"""
mistral_agent.py
----------------
LLM translation agent — Agent 3 (Safe & Verified Patient Report Translation).

Uses Mistral-7B-Instruct-v0.1 (GGUF via llama.cpp) or any HuggingFace model.

This module handles:
  - Loading the LLM (llama.cpp GGUF or HuggingFace pipeline).
  - Formatting prompts in the correct chat template (LLaMA-3 or Mistral format).
  - Generating patient-friendly translations from clinical reports.
  - Building normal and strict correction prompts.
"""

import os
import re
import time
import logging
import warnings
from typing import List, Dict, Optional

import torch
from transformers import (
    AutoTokenizer,
    AutoModelForCausalLM,
    BitsAndBytesConfig,
    pipeline,
    logging as hf_logging,
)

try:
    from llama_cpp import Llama
    LLAMA_CPP_AVAILABLE = True
except ImportError:
    LLAMA_CPP_AVAILABLE = False
    print("⚠️  llama-cpp-python not available. GGUF models will not work.")

from colorama import Fore, init as colorama_init

colorama_init(autoreset=True)
warnings.filterwarnings("ignore")
hf_logging.set_verbosity_error()

logger = logging.getLogger("Agent3")

# ═══════════════════════════════════════════════════════════════════════════
#  CONFIGURATION
# ═══════════════════════════════════════════════════════════════════════════

CFG = {
    # Chemin GGUF local (utilisé par défaut)
    "llm_model_id"      : os.getenv("MISTRAL_MODEL_PATH", r"C:\Users\amine\Desktop\PCD\global_project\LangGraph\models\mistral\mistral-7b-instruct-v0.1.Q4_K_M.gguf"),
    "llm_quantization"  : "4bit",       # pour les modèles HuggingFace uniquement
    "llm_max_new_tokens": 512,
    "llm_temperature"   : 0.3,
    "llm_top_p"         : 0.9,
    "llm_do_sample"     : True,
    "max_iterations"    : 5,
    "match_threshold"   : 1.0,
    "device"            : "cuda" if torch.cuda.is_available() else "cpu",
    "dtype"             : torch.float16 if torch.cuda.is_available() else torch.float32,
    "hf_token"          : None,
}

# ═══════════════════════════════════════════════════════════════════════════
#  SYSTEM MESSAGES
# ═══════════════════════════════════════════════════════════════════════════

SYSTEM_MSG_NORMAL = """You are a compassionate medical assistant explaining chest X-ray results \
to a patient who has no medical background. Use simple, clear English. \
Do NOT use medical jargon in the explanation. Be reassuring but accurate. \
Only describe the conditions you are given — do not add or remove any.

IMPORTANT: At the very end of your response, you MUST add exactly this line (do not modify it):
CLINICAL FINDINGS: {label_placeholder}

This line is required for record-keeping and must appear verbatim."""

SYSTEM_MSG_STRICT = """You are a precise medical assistant. \
Your task is to write a patient-friendly explanation that covers EXACTLY the listed conditions.

Rules:
1. Every condition in the list MUST be explained clearly in plain English.
2. You MUST NOT mention any condition that is NOT in the list.
3. Do not use medical abbreviations in the explanation.
4. Keep the tone warm and easy to understand.
5. At the very end, you MUST include this exact line:
   CLINICAL FINDINGS: {label_placeholder}
   (copy it verbatim — do not rephrase it)

Violating any rule is unacceptable."""


# ═══════════════════════════════════════════════════════════════════════════
#  LLM LOADING
# ═══════════════════════════════════════════════════════════════════════════

def build_bnb_config(quant: str) -> Optional[BitsAndBytesConfig]:
    """Build BitsAndBytesConfig for HuggingFace models."""
    if quant == "4bit":
        return BitsAndBytesConfig(
            load_in_4bit=True,
            bnb_4bit_use_double_quant=True,
            bnb_4bit_quant_type="nf4",
            bnb_4bit_compute_dtype=torch.float16,
        )
    elif quant == "8bit":
        return BitsAndBytesConfig(load_in_8bit=True)
    return None


def load_llm(cfg: Dict):
    """
    Load the LLM — supports GGUF (llama.cpp) and HuggingFace models.

    Returns:
        (tokenizer, model_or_llama, hf_pipeline)

    For GGUF  : (None,      llama_model, None)
    For HF    : (tokenizer, hf_model,    hf_pipeline)
    """
    model_id = cfg["llm_model_id"]
    device   = cfg.get("device", "cuda" if torch.cuda.is_available() else "cpu")
    hf_token = cfg.get("hf_token")

    # ── GGUF via llama.cpp ────────────────────────────────────────
    if os.path.isfile(model_id) and model_id.lower().endswith(".gguf"):
        if not LLAMA_CPP_AVAILABLE:
            raise ImportError(
                "llama-cpp-python is required for GGUF models.\n"
                "Install with: pip install llama-cpp-python"
            )

        logger.info(f"Loading GGUF model: {model_id}")
        llama_model = Llama(
            model_path   = model_id,
            n_ctx        = 2048,
            n_threads    = 4,
            n_gpu_layers = -1 if device == "cuda" else 0,
            verbose      = False,
        )
        logger.info("✅ GGUF LLM loaded successfully.")
        # ✅ Retourne llama_model dans la 2e position (model),
        #    None pour tokenizer et None pour pipeline
        return None, llama_model, None

    # ── HuggingFace model ─────────────────────────────────────────
    else:
        bnb_cfg   = build_bnb_config(cfg.get("llm_quantization", "none"))

        logger.info(f"Loading HF tokenizer: {model_id}")
        tokenizer = AutoTokenizer.from_pretrained(
            model_id, token=hf_token, use_fast=True
        )
        if tokenizer.pad_token is None:
            tokenizer.pad_token = tokenizer.eos_token

        logger.info(f"Loading HF model on {device} ...")
        model = AutoModelForCausalLM.from_pretrained(
            model_id,
            token              = hf_token,
            torch_dtype        = cfg.get("dtype") if not bnb_cfg else None,
            quantization_config= bnb_cfg,
            device_map         = "auto" if device == "cuda" else None,
            low_cpu_mem_usage  = True,
        )
        model.eval()

        hf_pipe = pipeline(
            task            = "text-generation",
            model           = model,
            tokenizer       = tokenizer,
            max_new_tokens  = cfg.get("llm_max_new_tokens", 512),
            temperature     = cfg.get("llm_temperature", 0.3),
            top_p           = cfg.get("llm_top_p", 0.9),
            do_sample       = cfg.get("llm_do_sample", True),
            return_full_text= False,
            pad_token_id    = tokenizer.pad_token_id,
            eos_token_id    = tokenizer.eos_token_id,
        )
        logger.info("✅ HF LLM loaded successfully.")
        return tokenizer, model, hf_pipe


# ═══════════════════════════════════════════════════════════════════════════
#  PROMPT ENGINEERING
# ═══════════════════════════════════════════════════════════════════════════

def build_anchor_line(confirmed_labels: List[str]) -> str:
    return "CLINICAL FINDINGS: " + ", ".join(confirmed_labels)


def build_normal_prompt(clinical_report: str, confirmed_labels: List[str]) -> str:
    labels_str  = ", ".join(confirmed_labels)
    anchor_line = build_anchor_line(confirmed_labels)

    return (
        f"A radiologist has reviewed the chest X-ray and found the following conditions: {labels_str}.\n"
        f"\nThe full clinical report is:\n{clinical_report}\n"
        f"\nPlease write a clear, simple explanation for the patient about these findings. "
        f"Explain each finding in plain English "
        f"(e.g., 'fluid around the lungs' instead of 'pleural effusion').\n"
        f"\nAfter your explanation, end with this exact line on its own:\n"
        f"{anchor_line}"
    )


def build_strict_prompt(
    confirmed_labels: List[str],
    previous_output: str,
    diff: Dict,
) -> str:
    labels_str  = ", ".join(confirmed_labels)
    missing_str = ", ".join(diff["missing"]) if diff["missing"] else "None"
    extra_str   = ", ".join(diff["extra"])   if diff["extra"]   else "None"
    anchor_line = build_anchor_line(confirmed_labels)

    return (
        f"The required conditions are EXACTLY: {labels_str}.\n"
        f"\nProblems found in the previous explanation:\n"
        f"  - Conditions MISSING from explanation : {missing_str}\n"
        f"  - Conditions ADDED that should NOT be : {extra_str}\n"
        f"\nPrevious (incorrect) explanation:\n{previous_output}\n"
        f"\nNow rewrite the patient explanation. "
        f"Include EVERY condition in the required list using plain English. "
        f"Remove ALL conditions not in the required list.\n"
        f"\nEnd your response with this exact line:\n"
        f"{anchor_line}"
    )


def format_chat_prompt(system_msg: str, user_msg: str, model_id: str) -> str:
    """Format prompt for LLaMA-3 or Mistral chat templates."""
    if "llama-3" in model_id.lower() or "llama3" in model_id.lower():
        return (
            "<|begin_of_text|>"
            "<|start_header_id|>system<|end_header_id|>\n"
            f"{system_msg}<|eot_id|>"
            "<|start_header_id|>user<|end_header_id|>\n"
            f"{user_msg}<|eot_id|>"
            "<|start_header_id|>assistant<|end_header_id|>\n"
        )
    else:
        # Mistral format
        return (
            f"[INST] <<SYS>>\n{system_msg}\n<</SYS>>\n\n"
            f"{user_msg} [/INST]"
        )


# ═══════════════════════════════════════════════════════════════════════════
#  TRANSLATION FUNCTION
# ═══════════════════════════════════════════════════════════════════════════

def translate_report(
    prompt: str,
    system_msg: str,
    llm_pipeline_or_llama,
    model_id: str,
) -> str:
    """
    Generate a patient-friendly translation using the loaded LLM.

    Args:
        prompt               : User-side instruction / context.
        system_msg           : System-level instruction (normal or strict).
        llm_pipeline_or_llama: llama.cpp Llama model OR HuggingFace pipeline.
        model_id             : Model path/id string (for template selection).

    Returns:
        Generated text string (assistant reply only).
    """
    # ✅ FIX : guard contre None — message d'erreur clair
    if llm_pipeline_or_llama is None:
        raise ValueError(
            "❌ translate_report() a reçu llm_pipeline_or_llama=None.\n"
            "Vérifiez que load_llm() est appelé et que le modèle est bien "
            "passé à self_correction_loop()."
        )

    t0 = time.time()

    # ── GGUF / llama.cpp ─────────────────────────────────────────
    if hasattr(llm_pipeline_or_llama, "create_chat_completion"):
        response = llm_pipeline_or_llama.create_chat_completion(
            messages=[
                {"role": "system", "content": system_msg},
                {"role": "user",   "content": prompt},
            ],
            max_tokens  = CFG["llm_max_new_tokens"],
            temperature = CFG["llm_temperature"],
            top_p       = CFG["llm_top_p"],
        )
        generated = response["choices"][0]["message"]["content"].strip()
        logger.info(f"GGUF response content length: {len(generated)}")

    # ── llama.cpp __call__ fallback (ancienne API) ────────────────
    elif hasattr(llm_pipeline_or_llama, "__call__") and hasattr(llm_pipeline_or_llama, "n_ctx"):
        formatted = format_chat_prompt(system_msg, prompt, model_id)
        response  = llm_pipeline_or_llama(
            formatted,
            max_tokens     = CFG["llm_max_new_tokens"],
            temperature    = CFG["llm_temperature"],
            top_p          = CFG["llm_top_p"],
            stop           = ["</s>", "[INST]"],
            echo           = False,
        )
        generated = response["choices"][0]["text"].strip()

    # ── HuggingFace pipeline ──────────────────────────────────────
    else:
        formatted = format_chat_prompt(system_msg, prompt, model_id)
        result    = llm_pipeline_or_llama(formatted)
        generated = result[0]["generated_text"].strip()

    elapsed = time.time() - t0
    logger.info(f"⏱️  LLM generation: {elapsed:.1f}s | {len(generated)} chars")
    return generated