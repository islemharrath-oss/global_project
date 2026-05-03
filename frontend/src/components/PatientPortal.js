
import React, { useState, useRef, useCallback } from 'react';
import { patientAnalyze } from '../api';
import './PatientPortal.css';

export default function PatientPortal({ user, onLogout }) {
  const [imageFile, setImageFile]         = useState(null);
  const [preview, setPreview]             = useState(null);
  const [dragOver, setDragOver]           = useState(false);
  const [isLoading, setIsLoading]         = useState(false);
  const [result, setResult]               = useState(null);
  const [error, setError]                 = useState('');
  const fileInputRef = useRef(null);

  const displayName = user?.first_name
    ? `${user.first_name} ${user.last_name || ''}`.trim()
    : user?.username || 'Patient';

  const handleFile = useCallback((file) => {
    if (!file || !file.type.startsWith('image/')) {
      setError('Please select a valid image (JPEG, PNG).');
      return;
    }
    setError('');
    setResult(null);
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target.result);
    reader.readAsDataURL(file);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    handleFile(e.dataTransfer.files[0]);
  }, [handleFile]);

  const handleAnalyze = async () => {
    if (!imageFile) return;
    setIsLoading(true);
    setError('');
    setResult(null);
    try {
      const data = await patientAnalyze(imageFile);
      setResult(data);
    } catch (err) {
      setError(err.message || 'Analysis failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    setImageFile(null);
    setPreview(null);
    setResult(null);
    setError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="portal-shell">
      {/* Header */}
      <header className="portal-header">
        <div className="portal-header-inner">
          <div className="portal-logo">
            <span className="portal-logo-icon">⚕</span>
            <div>
              <p className="portal-logo-title">MedVision</p>
              <p className="portal-logo-sub">Patient Portal</p>
            </div>
          </div>
          <div className="portal-user">
            <div className="portal-user-chip">
              <span className="portal-user-avatar">
                {displayName[0]?.toUpperCase() || 'P'}
              </span>
              <span className="portal-user-name">{displayName}</span>
            </div>
            <button className="portal-logout" onClick={onLogout}>Logout</button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="portal-main">
        <div className="portal-welcome">
          <h1 className="portal-welcome-title">
            Welcome, <span className="portal-accent">{displayName}</span>
          </h1>
          <p className="portal-welcome-sub">
            Upload your chest X-ray image to receive a personalized explanation from our AI system.
          </p>
        </div>

        <div className="portal-card">
          {/* Upload zone */}
          <div className="portal-section">
            <h2 className="portal-section-title">
              <span className="portal-section-num">01</span>
              Upload your X-Ray
            </h2>

            {!preview ? (
              <div
                className={`portal-drop ${dragOver ? 'portal-drop--active' : ''}`}
                onDrop={handleDrop}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={(e) => { handleFile(e.target.files[0]); e.target.value = ''; }}
                />
                <div className="portal-drop-icon">🫁</div>
                <p className="portal-drop-main">Drag your X-ray here</p>
                <p className="portal-drop-sub">or click to browse</p>
                <span className="portal-drop-badge">PNG · JPEG · WEBP</span>
              </div>
            ) : (
              <div className="portal-preview">
                <img src={preview} alt="X-Ray preview" className="portal-preview-img" />
                <div className="portal-preview-meta">
                  <span className="portal-preview-name">📁 {imageFile?.name}</span>
                  <button
                    className="portal-clear"
                    onClick={handleClear}
                    disabled={isLoading}
                  >
                    ✕ Remove
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Analyze button */}
          {preview && !result && (
            <div className="portal-section">
              <h2 className="portal-section-title">
                <span className="portal-section-num">02</span>
                Get your explanation
              </h2>
              <button
                className={`portal-analyze-btn ${isLoading ? 'portal-analyze-btn--loading' : ''}`}
                onClick={handleAnalyze}
                disabled={isLoading || !imageFile}
              >
                {isLoading ? (
                  <>
                    <span className="portal-spinner" />
                    Analyzing your X-ray...
                  </>
                ) : (
                  <>
                    🧠 Analyze my X-ray
                  </>
                )}
              </button>
              {isLoading && (
                <p className="portal-loading-hint">
                  Our AI is analyzing your radiograph. This may take 10–30 seconds.
                </p>
              )}
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="portal-error">
              <span>⚠️</span> {error}
            </div>
          )}

          {/* Result */}
          {result && (
            <div className="portal-section portal-result">
              <h2 className="portal-section-title">
                <span className="portal-section-num">03</span>
                Your personalized explanation
              </h2>
              <div className="portal-explanation">
                <div className="portal-explanation-header">
                  <span className="portal-explanation-icon">💬</span>
                  <div>
                    <p className="portal-explanation-label">AI Explanation</p>
                    <p className="portal-explanation-date">
                      {result.date
                        ? new Date(result.date).toLocaleDateString('en-GB', {
                            day: '2-digit', month: 'long', year: 'numeric'
                          })
                        : new Date().toLocaleDateString('en-GB', {
                            day: '2-digit', month: 'long', year: 'numeric'
                          })
                      }
                    </p>
                  </div>
                </div>
                <div className="portal-explanation-body">
                  {(result.mistral_explanation || 'No explanation available.')
                    .split('\n')
                    .filter(Boolean)
                    .map((para, i) => (
                      <p key={i} className="portal-explanation-para">{para}</p>
                    ))
                  }
                </div>
                <div className="portal-disclaimer">
                  <span>ℹ️</span>
                  <p>
                    This explanation is generated by AI as an informational aid only.
                    Always consult your doctor for medical decisions.
                  </p>
                </div>
              </div>

              <button className="portal-new-btn" onClick={handleClear}>
                ↺ Analyze another image
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}