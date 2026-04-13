
import React, { useState } from "react";
import XAIViewer from "./XAIViewer";
import "./ReportDisplay.css";

function ReportDisplay({ report, isLoading, error }) {
  const [copied, setCopied] = useState(false);

  const parsedRawReport = (() => {
    if (!report?.raw_report || typeof report.raw_report !== "string") {
      return {};
    }

    try {
      return JSON.parse(report.raw_report);
    } catch {
      return {};
    }
  })();

  const handleCopy = () => {
    if (!report) return;
    navigator.clipboard.writeText(report.raw_text || formatReport(report));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!report) return;
    const text = report.raw_text || formatReport(report);
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `rapport_medical_${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatReport = (report) => {
    if (!report) return "";
    return Object.entries(report)
      .filter(([k]) => k !== "raw_text")
      .map(([k, v]) => `${k.toUpperCase()}\n${v}`)
      .join("\n\n");
  };

  if (isLoading) {
    return (
      <div className="report-container">
        <div className="report-loading">
          <div className="pulse-ring" />
          <div className="pulse-ring pulse-ring--2" />
          <div className="pulse-ring pulse-ring--3" />
          <span className="loading-icon">🧬</span>
          <p className="loading-text">Analyse en cours par MedGemma...</p>
          <p className="loading-sub">Génération du rapport radiologique</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="report-container">
        <div className="report-error">
          <span className="error-icon">⚠️</span>
          <p className="error-title">Erreur d'analyse</p>
          <p className="error-msg">{error}</p>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="report-container report-container--empty">
        <div className="report-placeholder">
          <span className="placeholder-icon">📄</span>
          <p className="placeholder-text">
            Le rapport médical apparaîtra ici après l'analyse
          </p>
        </div>
      </div>
    );
  }

  const sections = report.sections || [
    { title: "Findings", content: report.findings || "" },
    { title: "Impression", content: report.impression || "" },
    {
      title: "Pathologies Détectées",
      content: Array.isArray(report.pathologies)
        ? report.pathologies.join(", ")
        : report.pathologies || "",
    },
    { title: "Recommandations", content: report.recommendations || "" },
  ];

  const originalImage =
    report.image_url ||
    report.image ||
    report.imageUrl ||
    null;
  const xaiImage =
    report.xai_url ||
    report.xai_image ||
    report.xaiImage ||
    null;
  const xaiMethod =
    report.xai_method ||
    report.xaiMethod ||
    parsedRawReport.xai_method ||
    "Grad-CAM";

  // Render XAI block under report whenever we have at least the original image.
  const showXAI = Boolean(originalImage || xaiImage);

  return (
    <div className="report-container">
      <div className="report-header">
        <div className="report-header-left">
          <h2 className="report-title">
            <span className="title-accent">02</span> Rapport Radiologique
          </h2>
          <span className="report-badge">
            MedGemma • {new Date().toLocaleDateString("fr-FR")}
          </span>
        </div>
        <div className="report-actions">
          <button className="action-btn" onClick={handleCopy} title="Copier">
            {copied ? "✓ Copié" : "📋 Copier"}
          </button>
          <button className="action-btn action-btn--primary" onClick={handleDownload} title="Télécharger">
            ⬇ Télécharger
          </button>
        </div>
      </div>

      <div className="report-body">
        {sections.map((section, i) => (
          <div key={i} className="report-section">
            <h3 className="section-title">
              <span className="section-num">{String(i + 1).padStart(2, "0")}</span>
              {section.title}
            </h3>
            <p className="section-content">
              {section.content || "Aucune anomalie détectée dans cette section."}
            </p>
          </div>
        ))}
      </div>

      {showXAI && (
        <div className="report-xai-section">
          <XAIViewer
            originalImage={originalImage}
            xaiImage={xaiImage}
            xaiMethod={xaiMethod}
            pathologies={Array.isArray(report.pathologies) ? report.pathologies : []}
          />
        </div>
      )}

      {report.confidence_score && (
        <div className="report-footer">
          <span className="confidence-label">Score de confiance IA :</span>
          <div className="confidence-bar-wrapper">
            <div
              className="confidence-bar"
              style={{ width: `${report.confidence_score}%` }}
            />
          </div>
          <span className="confidence-value">{report.confidence_score}%</span>
        </div>
      )}
    </div>
  );
};

export default ReportDisplay;