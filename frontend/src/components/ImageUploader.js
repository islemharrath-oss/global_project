import React, { useState, useRef, useCallback } from "react";
import "./ImageUploader.css";

function ImageUploader({ onImageSelect, isLoading }) {
  const [dragOver, setDragOver] = useState(false);
  const [preview, setPreview] = useState(null);
  const [fileName, setFileName] = useState("");
  const fileInputRef = useRef(null);

  const handleFile = useCallback(
    (file) => {
      if (!file || !file.type.startsWith("image/")) {
        alert("Veuillez sélectionner une image valide.");
        return;
      }
      setFileName(file.name);
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreview(e.target.result);
        onImageSelect(file, e.target.result);
      };
      reader.readAsDataURL(file);
    },
    [onImageSelect]
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

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => setDragOver(false);

  const handleInputChange = (e) => {
    const file = e.target.files[0];
    if (file) handleFile(file);
    // Reset input so same file can be re-selected
    e.target.value = "";
  };

  const clearImage = () => {
    setPreview(null);
    setFileName("");
    if (fileInputRef.current) fileInputRef.current.value = "";
    onImageSelect(null, null);
  };

  return (
    <div className="uploader-container">
      <h2 className="uploader-title">
        <span className="title-accent">01</span> Charger une Radiographie
      </h2>
      <p className="uploader-desc">
        Importez une image chest X-ray (JPEG, PNG, DICOM converti) pour générer
        un rapport médical automatique via MedGemma.
      </p>

      {!preview ? (
        <div
          className={`drop-zone ${dragOver ? "drop-zone--active" : ""}`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          {/* Input covers the whole zone — it handles clicks directly */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="file-input"
            onChange={handleInputChange}
          />
          <div className="drop-icon">🫁</div>
          <p className="drop-main">Glissez votre radiographie ici</p>
          <p className="drop-sub">ou cliquez pour parcourir</p>
          <span className="drop-badge">PNG · JPEG · WEBP</span>
        </div>
      ) : (
        <div className="preview-container">
          <div className="preview-image-wrapper">
            <img src={preview} alt="Chest X-Ray" className="preview-image" />
            <div className="preview-overlay">
              <span className="preview-scan-line" />
            </div>
          </div>
          <div className="preview-meta">
            <div className="preview-info">
              <span className="preview-icon">📁</span>
              <span className="preview-name">{fileName}</span>
            </div>
            <button
              className="preview-clear"
              onClick={clearImage}
              disabled={isLoading}
            >
              ✕ Supprimer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default ImageUploader;