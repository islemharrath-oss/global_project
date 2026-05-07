# MedVision - Medical X-ray Analysis Platform

A modern, full-stack web application for analyzing X-ray images using a **Multi-Agent AI Pipeline** (LangGraph) with explainable AI (XAI) visualization and professional medical PDF reporting.

## 🎥 Project Demo
👉 **[Click here to watch the Demo Video](INSERT_YOUR_DEMO_VIDEO_LINK_HERE)**

## 🎯 Project Overview
MedVision is a complete medical ecosystem featuring a Django backend, a React frontend, and a dedicated local AI service.
- **Admin Dashboard**: Manage doctors and patients, maintain data integrity.
- **Doctor Portal**: Upload X-rays, review analysis history, and export professional PDF medical reports.
- **Multi-Agent AI Pipeline (LangGraph)**:
  - **Agent 1 (Classifier)**: An ensemble of CNNs (DenseNet, EfficientNet, ConvNeXt) to detect 14 pathologies and generate Grad-CAM heatmaps.
  - **Agent 2 (MedGemma)**: Drafts structured clinical findings and impressions based on the classifier's output.
  - **Agent 3 (Mistral + CheXbert)**: Translates the clinical report into a patient-friendly explanation (Mistral) and instantly checks it against clinical labels to prevent hallucinations (CheXbert). This combined translation/verification loop improves scalability, consistency, and deployment feasibility.

⚠️ *Disclaimer: MedVision is an aid-to-diagnosis tool only and does not replace professional medical consultation.*

---

## 📥 Downloading the AI Models
Because the AI models are too large for GitHub (over the 100MB limit), you must download them manually and place them in the correct folders before running the AI service.

1. **CNN Models (Agent 1 - Classifier)**
   - Download the model weights from this Drive link: 👉 **[Insert Google Drive Link Here]**
   - Place them in: `LangGraph/models/`
   - Required files: 
     - `best_densenet121.pth`
     - `best_efficientnet_b4 (3).pth`
     - `best_convnext_small (1).pth`
     - `best_weights (1).npy`

2. **Mistral 7B (Agent 3 - Patient Explanation)**
   - Download the GGUF quantized model (e.g., `mistral-7b-instruct-v0.1.Q4_K_M.gguf`) from Hugging Face.
   - Place it in: `LangGraph/models/mistral/`

3. **MedGemma (Agent 2 - Clinical Report)**
   - Place the MedGemma LoRA weights in: `LangGraph/models/medgemma-mimic-lora-final/`

---

## 🚀 Quick Start & Setup

### Prerequisites
- Python 3.10+
- Node.js 16+ & npm
- PostgreSQL (via Docker)
- A CUDA-compatible GPU (highly recommended for the local AI Service)

### 1. Database Setup (Docker/PostgreSQL)
Start your database service. The project is configured to use PostgreSQL:
- **Adminer UI**: `http://localhost:8081`
- **System**: PostgreSQL
- **Server**: `db`
- **Username**: `medvision_user`
- **Password**: `medvision_password`
- **Database**: `medvision_db`

### 2. Backend Setup (Django - Port 8000)
```bash
cd backend

# Create and activate virtual environment
python -m venv .venv
.\.venv\Scripts\activate   # On Windows
# source .venv/bin/activate # On macOS/Linux

# Install dependencies
pip install -r requirements.txt

# Configure environment (Ensure DB credentials match the Docker setup)
cp .env.example .env

# Run migrations and setup admin
python manage.py migrate
python manage.py createsuperuser

# Start the server
python manage.py runserver 8000
```

### 3. Frontend Setup (React - Port 3000)
```bash
cd frontend

# Install dependencies
npm install

# Start the development server
npm start
```

### 4. AI Service Setup (LangGraph - Port 9000)
*Make sure you have downloaded the models (see the "Downloading the AI Models" section) before starting this service.*
```bash
cd LangGraph

# Create and activate virtual environment
python -m venv .venv
.\.venv\Scripts\activate   # On Windows

# Install dependencies
pip install -r requirements.txt

# Start the FastAPI AI Orchestrator
uvicorn api:app --host 127.0.0.1 --port 9000
```
*Note: The AI service processes everything 100% locally to ensure strict medical data privacy (No cloud APIs).*

---

## 🔌 System Architecture
- **Django REST API**: `http://localhost:8000/api/`
- **LangGraph AI API**: `http://localhost:9000/analyze`
- **React Frontend**: `http://localhost:3000/`

---

## 🔐 Security & Roles
- **Admin**: Full CRUD access for Doctors and Patients. Can delete records.
- **Doctor**: Read-only access to Patient registration. Can upload X-rays, view history, and generate PDF reports.

## 📝 License
This project is licensed under the MIT License - see LICENSE file for details.
