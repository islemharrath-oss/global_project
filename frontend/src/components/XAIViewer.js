import React, { useState } from "react";

function XAIViewer({ originalImage, xaiImage, xaiMethod, pathologies }) {
  const [viewMode, setViewMode] = useState("original");
  const [opacity, setOpacity] = useState(75);

  if (!originalImage && !xaiImage) {
    return (
      <div className="xai-container xai-container--empty">
        <span className="xai-empty-icon">?</span>
        <p className="xai-empty-text">The AI explanation map will appear after analysis</p>
      </div>
    );
  }

  const MODES = [
    { id: "original", label: "Original" },
    { id: "xai",      label: "Heatmap"  },
    { id: "overlay",  label: "Overlay"  },
  ];

  const imgStyle = {
    width: "100%",
    height: "100%",
    objectFit: "contain",
    display: "block",
  };

  return (
    <div className="xai-container">
      <div className="xai-header">
        <div>
          <h2 className="xai-title">
            <span className="title-accent">XAI</span>
            Activation Map
          </h2>
          <p className="xai-subtitle">
            Method: <span className="xai-method">{xaiMethod || "Grad-CAM"}</span>
            {" - "}
            <span style={{ color: "#6aacaa" }}>AI model attention zones</span>
          </p>
        </div>

        <div className="view-toggle">
          {MODES.map(({ id, label }) => (
            <button
              key={id}
              className={`toggle-btn ${viewMode === id ? "toggle-btn--active" : ""}`}
              onClick={() => setViewMode(id)}
              disabled={id !== "original" && !xaiImage}
              style={id !== "original" && !xaiImage ? { opacity: 0.4, cursor: "not-allowed" } : {}}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="xai-viewer">
        <div
          style={{
            position: "relative",
            width: "100%",
            height: "500px",
            background: "#0a1018",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
          }}
        >
          {/* ORIGINAL MODE */}
          {viewMode === "original" && (
            originalImage
              ? <img src={originalImage} alt="Original radiograph" style={imgStyle} />
              : <div className="xai-pending"><div className="scan-grid" /><span style={{ position: "relative", zIndex: 1 }}>Original image not available</span></div>
          )}

          {/* HEATMAP MODE */}
          {viewMode === "xai" && (
            xaiImage
              ? <img src={xaiImage} alt="Grad-CAM Heatmap" style={imgStyle} />
              : <div className="xai-pending"><div className="scan-grid" /><span style={{ position: "relative", zIndex: 1 }}>Heatmap not available</span></div>
          )}

          {/* OVERLAY MODE */}
          {viewMode === "overlay" && (
            <div style={{ position: "relative", width: "100%", height: "100%" }}>
              {originalImage && (
                <img
                  src={originalImage}
                  alt="Original radiograph"
                  style={{ ...imgStyle, position: "absolute", inset: 0 }}
                />
              )}
              {xaiImage && (
                <img
                  src={xaiImage}
                  alt="Heatmap overlay"
                  style={{
                    ...imgStyle,
                    position: "absolute",
                    inset: 0,
                    opacity: opacity / 100,
                    mixBlendMode: "screen",
                  }}
                />
              )}
              {!originalImage && !xaiImage && (
                <div className="xai-pending">
                  <div className="scan-grid" />
                  <span style={{ position: "relative", zIndex: 1 }}>Images not available</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Overlay opacity control */}
        {viewMode === "overlay" && xaiImage && (
          <div className="opacity-control">
            <span className="opacity-label">Heatmap opacity</span>
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

      {/* Pathology tags */}
      {pathologies && pathologies.length > 0 && (
        <div className="pathology-tags">
          <span className="tags-label">Highlighted zones:</span>
          <div className="tags-list">
            {pathologies.map((p, i) => (
              <span key={i} className="tag">{p}</span>
            ))}
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="xai-legend">
        {[
          { color: "#ff2222", label: "High activation"     },
          { color: "#ffaa00", label: "Moderate activation" },
          { color: "#00aaff", label: "Low activation"      },
        ].map(({ color, label }) => (
          <div key={label} className="legend-item">
            <span className="legend-color" style={{ background: color }} />
            <span>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default XAIViewer;