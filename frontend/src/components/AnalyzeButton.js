import React from "react";
import "./AnalyzeButton.css";

/**
 * AnalyzeButton — main button that triggers the analysis
 * via the Django backend API → MedGemma → XAI pipeline.
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
            <span>Analysis in progress...</span>
          </>
        ) : (
          <>
            <span className="btn-icon">🧠</span>
            <span>Analyze</span>
            <span className="btn-arrow">→</span>
          </>
        )}
      </button>

      {!hasImage && !isLoading && (
        <p className="analyze-hint">Upload an image to start the analysis</p>
      )}

      {isLoading && (
        <p className="analyze-hint analyze-hint--active">
          Analyzing the radiograph... this may take 10 to 30 seconds
        </p>
      )}
    </div>
  );
};

export default AnalyzeButton;