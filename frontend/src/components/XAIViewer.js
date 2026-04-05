
import React, { useState } from "react";
import "./XAIViewer.css";

/**
 * XAIViewer — affiche la carte de chaleur (Grad-CAM / SHAP) 
 * générée par le module d'Explainable AI côté backend.
 */
function XAIViewer({ originalImage, xaiImage, xaiMethod, pathologies }) {
  const [viewMode, setViewMode] = useState("overlay"); // "original" | "xai" | "overlay"
  const [opacity, setOpacity] = useState(70);

  if (!originalImage) {
    return (
      <div className="xai-container xai-container--empty">
        <span className="xai-empty-icon">🔬</span>
        <p className="xai-empty-text">
          La carte d'explication IA apparaîtra après l'analyse
        </p>
      </div>
    );
  }

  return (
    <div className="xai-container">
      <div className="xai-header">
        <div>
          <h2 className="xai-title">
            <span className="title-accent">03</span> Explainable AI
          </h2>
          <p className="xai-subtitle">
            Méthode :{" "}
            <span className="xai-method">{xaiMethod || "Grad-CAM"}</span>
          </p>
        </div>

        <div className="view-toggle">
          {["original", "xai", "overlay"].map((mode) => (
            <button
              key={mode}
              className={`toggle-btn ${viewMode === mode ? "toggle-btn--active" : ""}`}
              onClick={() => setViewMode(mode)}
            >
              {mode === "original" ? "Original" : mode === "xai" ? "Heatmap" : "Overlay"}
            </button>
          ))}
        </div>
      </div>

      <div className="xai-viewer">
        <div className="image-stack">
          {/* Original image always as base */}
          <img
            src={originalImage}
            alt="Original X-Ray"
            className="xai-img xai-img--base"
            style={{ opacity: viewMode === "xai" ? 0 : 1 }}
          />

          {/* XAI heatmap overlay */}
          {xaiImage && (
            <img
              src={xaiImage}
              alt="XAI Heatmap"
              className="xai-img xai-img--heatmap"
              style={{
                opacity:
                  viewMode === "xai"
                    ? 1
                    : viewMode === "overlay"
                    ? opacity / 100
                    : 0,
                mixBlendMode: viewMode === "overlay" ? "screen" : "normal",
              }}
            />
          )}

          {!xaiImage && (
            <div className="xai-pending">
              <div className="scan-grid" />
              <p>Génération de la heatmap...</p>
            </div>
          )}
        </div>

        {viewMode === "overlay" && xaiImage && (
          <div className="opacity-control">
            <span className="opacity-label">Opacité heatmap</span>
            <input
              type="range"
              min={10}
              max={100}
              value={opacity}
              onChange={(e) => setOpacity(Number(e.target.value))}
              className="opacity-slider"
            />
            <span className="opacity-value">{opacity}%</span>
          </div>
        )}
      </div>

      {pathologies && pathologies.length > 0 && (
        <div className="pathology-tags">
          <span className="tags-label">Zones surlignées :</span>
          <div className="tags-list">
            {pathologies.map((p, i) => (
              <span key={i} className="tag">
                {p}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="xai-legend">
        <div className="legend-item">
          <span className="legend-color" style={{ background: "#ff4444" }} />
          <span>Zone très activée</span>
        </div>
        <div className="legend-item">
          <span className="legend-color" style={{ background: "#ffaa00" }} />
          <span>Zone moyennement activée</span>
        </div>
        <div className="legend-item">
          <span className="legend-color" style={{ background: "#0044ff" }} />
          <span>Zone faiblement activée</span>
        </div>
      </div>
    </div>
  );
};

export default XAIViewer;