import React, { useState, useRef, useCallback } from "react";
import "./ImageUploader.css";

// ─── Config ────────────────────────────────────────────────────────────────
const CLASSIFIER_ENDPOINT = "/api/analyze/";

// ─── Helpers ───────────────────────────────────────────────────────────────
const SEVERITY_COLOR = {
  high:   { bg: "#ff4d4d22", border: "#ff4d4d", text: "#ff4d4d" },
  medium: { bg: "#ffaa0022", border: "#ffaa00", text: "#ffaa00" },
  low:    { bg: "#00c89322", border: "#00c893", text: "#00c893" },
};

function getSeverity(confidence) {
  if (confidence >= 0.7) return "high";
  if (confidence >= 0.4) return "medium";
  return "low";
}

// ─── Sub-component : Labels preview inside uploader ────────────────────────
function LabelsPreview({ labels, isClassifying }) {
  if (isClassifying) {
    return (
      <div className="labels-preview labels-preview--loading">
        <span className="labels-spinner" />
        <span className="labels-loading-text">Classifier analysis in progress...</span>
      </div>
    );
  }

  if (!labels || labels.length === 0) return null;

  return (
    <div className="labels-preview">
      <p className="labels-preview-title">
        <span className="labels-icon">🔬</span> Detected Labels
      </p>
      <div className="labels-chips">
        {labels.map((label, i) => {
          const sev = getSeverity(label.confidence ?? 0);
          const colors = SEVERITY_COLOR[sev];
          return (
            <span
              key={i}
              className="label-chip"
              style={{
                background: colors.bg,
                border: `1px solid ${colors.border}`,
                color: colors.text,
              }}
            >
              {label.name}
              {label.confidence != null && (
                <span className="label-conf">
                  {Math.round(label.confidence * 100)}%
                </span>
              )}
            </span>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────
function ImageUploader({ onImageSelect, onLabelsDetected, isLoading }) {
  const [dragOver, setDragOver]             = useState(false);
  const [preview, setPreview]               = useState(null);
  const [fileName, setFileName]             = useState("");
  const [isClassifying, setIsClassifying]   = useState(false);
  const [detectedLabels, setDetectedLabels] = useState([]);
  const [classifyError, setClassifyError]   = useState(null);
  const fileInputRef = useRef(null);

  // ── Classifier API call ──────────────────────────────────────────────────
  const classifyImage = useCallback(async (file) => {
    setIsClassifying(true);
    setClassifyError(null);
    setDetectedLabels([]);

    try {
      const formData = new FormData();
      formData.append("image", file);

      const token = localStorage.getItem("medvision_access_token");

      const response = await fetch(CLASSIFIER_ENDPOINT, {
        method: "POST",
        body: formData,
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const data = await response.json();

      let labels = [];
      if (Array.isArray(data.pathologies)) {
        labels = data.pathologies.map((l) =>
          typeof l === "string" ? { name: l, confidence: data.confidence_score / 100 } : l
        );
      } else if (Array.isArray(data.labels)) {
        labels = data.labels.map((l) =>
          typeof l === "string" ? { name: l, confidence: null } : l
        );
      } else if (Array.isArray(data.predictions)) {
        labels = data.predictions.map((l) =>
          typeof l === "string" ? { name: l, confidence: null } : l
        );
      }

      setDetectedLabels(labels);
      if (onLabelsDetected) onLabelsDetected(labels);

    } catch (err) {
      console.error("Classifier error:", err);
      setClassifyError("Unable to analyze the image. Please check the connection.");
    } finally {
      setIsClassifying(false);
    }
  }, [onLabelsDetected]);

  // ── File handling ────────────────────────────────────────────────────────
  const handleFile = useCallback(
    (file) => {
      if (!file || !file.type.startsWith("image/")) {
        alert("Please select a valid image.");
        return;
      }
      setFileName(file.name);
      setDetectedLabels([]);
      setClassifyError(null);

      const reader = new FileReader();
      reader.onload = (e) => {
        setPreview(e.target.result);
        onImageSelect(file, e.target.result);
      };
      reader.readAsDataURL(file);
    },
    [onImageSelect, classifyImage]
  );

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      handleFile(file);
    },
    [handleFile]
  );

  const handleDragOver  = (e) => { e.preventDefault(); setDragOver(true); };
  const handleDragLeave = ()  => setDragOver(false);

  const handleInputChange = (e) => {
    const file = e.target.files[0];
    if (file) handleFile(file);
    e.target.value = "";
  };

  const clearImage = () => {
    setPreview(null);
    setFileName("");
    setDetectedLabels([]);
    setClassifyError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    onImageSelect(null, null);
    if (onLabelsDetected) onLabelsDetected([]);
  };

  return (
    <div className="uploader-container">
      <h2 className="uploader-title">
        <span className="title-accent">01</span> Upload a Radiograph
      </h2>
      <p className="uploader-desc">
        Import a chest X-ray image (JPEG, PNG, converted DICOM) to generate
        an automatic medical report .
      </p>

      {!preview ? (
        <div
          className={`drop-zone ${dragOver ? "drop-zone--active" : ""}`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="file-input"
            onChange={handleInputChange}
          />
          <div className="drop-icon">🫁</div>
          <p className="drop-main">Drag your radiograph here</p>
          <p className="drop-sub">or click to browse</p>
          <span className="drop-badge">PNG · JPEG · WEBP</span>
        </div>
      ) : (
        <div className="preview-container">
          <div className="preview-image-wrapper">
            <img src={preview} alt="Chest X-Ray" className="preview-image" />
            <div className="preview-overlay">
              <span className="preview-scan-line" />
            </div>
            {isClassifying && (
              <div className="preview-classifying-badge">
                <span className="badge-spinner" /> Analyzing...
              </div>
            )}
          </div>

          <div className="preview-meta">
            <div className="preview-info">
              <span className="preview-icon">📁</span>
              <span className="preview-name">{fileName}</span>
            </div>
            <button
              className="preview-clear"
              onClick={clearImage}
              disabled={isLoading || isClassifying}
            >
              ✕ Remove
            </button>
          </div>

          <LabelsPreview labels={detectedLabels} isClassifying={isClassifying} />

          {classifyError && (
            <p className="classify-error">⚠️ {classifyError}</p>
          )}
        </div>
      )}
    </div>
  );
}

export default ImageUploader;