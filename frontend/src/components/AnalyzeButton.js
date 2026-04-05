
import React from "react";
import "./AnalyzeButton.css";

/**
 * AnalyzeButton — bouton principal qui déclenche l'analyse
 * via l'API Django backend → MedGemma → XAI pipeline.
 */
function AnalyzeButton({ onAnalyze, isLoading, hasImage }) {
  return (
    <div className="analyze-wrapper">
      <button
        className={`analyze-btn ${isLoading ? "analyze-btn--loading" : ""}`}
        onClick={onAnalyze}
        disabled={!hasImage || isLoading}
      >
        {isLoading ? (
          <>
            <span className="btn-spinner" />
            <span>Analyse en cours...</span>
          </>
        ) : (
          <>
            <span className="btn-icon">🧠</span>
            <span>Analyser avec MedGemma</span>
            <span className="btn-arrow">→</span>
          </>
        )}
      </button>

      {!hasImage && !isLoading && (
        <p className="analyze-hint">Chargez une image pour démarrer l'analyse</p>
      )}

      {isLoading && (
        <p className="analyze-hint analyze-hint--active">
          MedGemma analyse la radiographie... cela peut prendre 10 à 30 secondes
        </p>
      )}
    </div>
  );
};

export default AnalyzeButton;