FROM python:3.11-slim

WORKDIR /app

# Installe les outils système nécessaires pour NegBio/CheXpert
RUN apt-get update && apt-get install -y \
    git \
    && rm -rf /var/lib/apt/lists/*

# Installe FastAPI
RUN pip install --no-cache-dir fastapi uvicorn python-multipart

# Installe PyTorch CUDA sans vérification de hash
RUN pip install --no-cache-dir \
    torch==2.5.1+cu121 \
    torchvision==0.20.1+cu121 \
    torchaudio==2.5.1+cu121 \
    --index-url https://download.pytorch.org/whl/cu121 \
    --timeout 1000 \
    --retries 10 \
    --no-deps

# Installe les dépendances de PyTorch manuellement
RUN pip install --no-cache-dir \
    numpy \
    pillow \
    sympy \
    networkx \
    filelock \
    typing_extensions \
    fsspec \
    jinja2 \
    mpmath

# Installe LangGraph
RUN pip install --no-cache-dir \
    langgraph==1.1.9 \
    langchain==1.2.15 \
    langchain-core==1.3.0 \
    langgraph-checkpoint==4.0.2 \
    langgraph-prebuilt==1.0.10

# Installe les dépendances CheXpert + NegBio
RUN pip install --no-cache-dir \
    bioc \
    nltk \
    pandas \
    ply \
    pathlib2

# Télécharge les données NLTK nécessaires
RUN python -c "import nltk; nltk.download('punkt_tab'); nltk.download('punkt'); nltk.download('stopwords'); nltk.download('universal_tagset'); nltk.download('wordnet')"

# Installe le reste
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt \
    --extra-index-url https://download.pytorch.org/whl/cu121

# Copie le code
COPY agents/ ./agents/
COPY graph/ ./graph/
COPY main.py .
COPY api.py .

# Copie CheXpert labeler (avec NegBio patché)
COPY chexpert-labeler/ ./chexpert-labeler/

# Variables d'environnement pour CheXpert
ENV CHEXPERT_DIR=/app/chexpert-labeler
ENV NEGBIO_DIR=/app/chexpert-labeler/NegBio
ENV PYTHONPATH=/app/chexpert-labeler/NegBio:/app/chexpert-labeler:${PYTHONPATH}

EXPOSE 9000

CMD ["uvicorn", "api:app", "--host", "0.0.0.0", "--port", "9000"]