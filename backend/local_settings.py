"""
Local development environment settings configuration.
This file is NOT tracked in git and holds sensitive local information.
Copy from local_settings.example.py if it doesn't exist.
"""
import os
import sys
from pathlib import Path

# ─── Chemins de base ───────────────────────────────────────────
BASE_DIR = Path(__file__).resolve().parent

# ─── Chemin vers le projet LangGraph ───────────────────────────
# Modifie ce chemin selon où se trouve ton dossier LANGGRAPH
LANGGRAPH_DIR = Path(__file__).resolve().parent.parent / 'LANGGRAPH'

# Ajoute LangGraph au PATH Python pour pouvoir importer ses modules
if str(LANGGRAPH_DIR) not in sys.path:
    sys.path.insert(0, str(LANGGRAPH_DIR))

# ─── Dev settings ──────────────────────────────────────────────
DEBUG = True
SECRET_KEY = 'your-development-key'
ALLOWED_HOSTS = ['localhost', '127.0.0.1']

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}

# ─── Chemins des modèles IA ────────────────────────────────────
AI_MODELS = {
    'DENSENET':  LANGGRAPH_DIR / 'models' / 'best_densenet121.pth',
    'CHEXBERT':  LANGGRAPH_DIR / 'models' / 'chexbert.pth',
    'MEDGEMMA':  LANGGRAPH_DIR / 'models' / 'medgemma-mimic-lora-...',
}