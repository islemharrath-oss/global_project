import React, { useState, useCallback } from 'react';
import './App.css';
import Header from './components/Header';
import ImageUploader from './components/ImageUploader';
import AnalyzeButton from './components/AnalyzeButton';
import ReportDisplay from './components/ReportDisplay';
import XAIViewer from './components/XAIViewer';
import HistoryPanel from './components/HistoryPanel';
import { analyzeXray } from './api';
function App() {
  const [activePage, setActivePage] = useState('upload');

  // Analyse state
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [report, setReport] = useState(null);
  const [xaiImage, setXaiImage] = useState(null);
  const [error, setError] = useState(null);

  const handleImageSelect = useCallback((file, preview) => {
    setImageFile(file);
    setImagePreview(preview);
    // Reset results when new image is loaded
    setReport(null);
    setXaiImage(null);
    setError(null);
  }, []);

  const handleAnalyze = async () => {
    if (!imageFile) return;

    setIsLoading(true);
    setError(null);
    setReport(null);
    setXaiImage(null);

    try {
      const data = await analyzeXray(imageFile);

      setReport(data.report || data);
      setXaiImage(data.xai_image || null);
    } catch (err) {
      console.error('Analyze error:', err);
      setError(err.message || 'Erreur inconnue lors de l\'analyse');
    } finally {
      setIsLoading(false);
    }
  };

  // Load an analysis from History into the Analyse page
  const handleSelectFromHistory = (item) => {
    setActivePage('upload');
    setReport({
      sections: [
        { title: 'Impression', content: item.impression },
        { title: 'Pathologies Détectées', content: item.pathologies?.join(' · ') || 'Aucune' },
      ],
      confidence_score: item.confidence_score ?? item.confidence,
    });
    setImagePreview(null);
    setImageFile(null);
    setXaiImage(null);
    setError(null);
  };

  return (
    <div className="app">
      <Header activePage={activePage} onNavigate={setActivePage} />

      <main className="app-main">
        {/* ── PAGE : ANALYSE ──────────────────────────────────────────── */}
        {activePage === 'upload' && (
          <div className="page-analyse">
            <div className="page-analyse__left">
              <ImageUploader
                onImageSelect={handleImageSelect}
                isLoading={isLoading}
              />
              <AnalyzeButton
                onAnalyze={handleAnalyze}
                isLoading={isLoading}
                hasImage={!!imageFile}
              />
              <XAIViewer
                originalImage={imagePreview}
                xaiImage={xaiImage}
                xaiMethod="Grad-CAM"
                pathologies={
                  report?.sections?.find((s) => s.title === 'Pathologies Détectées')
                    ?.content?.split(' · ')
                    .filter(Boolean) || []
                }
              />
            </div>

            <div className="page-analyse__right">
              <ReportDisplay
                report={report}
                isLoading={isLoading}
                error={error}
              />
            </div>
          </div>
        )}

        {/* ── PAGE : HISTORIQUE ───────────────────────────────────────── */}
        {activePage === 'history' && (
          <div className="page-history">
            <HistoryPanel onSelectAnalysis={handleSelectFromHistory} />
          </div>
        )}

        {/* ── PAGE : À PROPOS ─────────────────────────────────────────── */}
        {activePage === 'about' && (
          <div className="page-about">
            <div className="about-card">
              <h2 className="about-title">
                <span className="title-accent">⚕</span> MedVision
              </h2>
              <p className="about-desc">
                MedVision est une plateforme d'aide au diagnostic radiologique
                propulsée par <strong>MedGemma</strong>, le modèle de vision médicale
                de Google DeepMind, couplé à un module d'explicabilité IA (Grad-CAM)
                pour visualiser les zones d'intérêt détectées.
              </p>
              <div className="about-features">
                {[
                  { icon: '🧠', label: 'IA MedGemma', desc: 'Modèle médical spécialisé en imagerie thoracique' },
                  { icon: '🔬', label: 'Explainable AI', desc: 'Grad-CAM pour visualiser les zones analysées' },
                  { icon: '📋', label: 'Rapport structuré', desc: 'Findings · Impression · Recommandations' },
                  { icon: '🔒', label: 'Données sécurisées', desc: 'Traitement local, aucune donnée externe' },
                ].map((f, i) => (
                  <div key={i} className="about-feature">
                    <span className="feature-icon">{f.icon}</span>
                    <div>
                      <strong>{f.label}</strong>
                      <p>{f.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <p className="about-warning">
                ⚠️ Outil d'aide au diagnostic uniquement. Ne remplace pas l'avis d'un médecin radiologue.
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;