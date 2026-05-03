import React, { useState, useEffect } from "react";
import "./HistoryPanel.css";
import { getHistory, deleteAnalysis } from "../api";

function HistoryPanel({ onSelectAnalysis }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const data = await getHistory();
      setHistory(data.results || []);
    } catch (err) {
      console.error("History fetch error:", err);
      // Mock data for UI dev
      setHistory([
        {
          id: 1,
          date: "2025-06-10T14:30:00",
          filename: "patient_001.png",
          impression: "Bilateral consolidation compatible with pneumonia.",
          pathologies: ["Pneumonia", "Infiltrates"],
          confidence: 91,
        },
        {
          id: 2,
          date: "2025-06-09T10:15:00",
          filename: "xray_case_002.jpg",
          impression: "No significant abnormality detected.",
          pathologies: [],
          confidence: 88,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (item) => {
    setSelected(item.id);
    if (onSelectAnalysis) onSelectAnalysis(item);
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm("Delete this analysis?")) return;
    try {
      await deleteAnalysis(id);
      setHistory((prev) => prev.filter((h) => h.id !== id));
    } catch (err) {
      console.error("Delete error:", err);
    }
  };

  const formatDate = (iso) => {
    const d = new Date(iso);
    return d.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="history-container">
      <div className="history-header">
        <h2 className="history-title">
          <span className="title-accent">📋</span> Analysis History
        </h2>
        <button className="refresh-btn" onClick={fetchHistory} title="Refresh">
          ↻ Refresh
        </button>
      </div>

      {loading ? (
        <div className="history-loading">
          <div className="loading-dots">
            <span /><span /><span />
          </div>
          <p>Loading history...</p>
        </div>
      ) : history.length === 0 ? (
        <div className="history-empty">
          <span>📭</span>
          <p>No analyses recorded</p>
        </div>
      ) : (
        <div className="history-list">
          {history.map((item) => (
            <div
              key={item.id}
              className={`history-card ${selected === item.id ? "history-card--selected" : ""}`}
              onClick={() => handleSelect(item)}
            >
              <div className="card-top">
                <div className="card-info">
                  <span className="card-filename">🫁 {item.filename || item.image_url?.split("/").pop() || `analysis_${item.id}`}</span>
                  <span className="card-date">{formatDate(item.date)}</span>
                </div>
                <button
                  className="card-delete"
                  onClick={(e) => handleDelete(e, item.id)}
                  title="Delete"
                >
                  ✕
                </button>
              </div>

              <p className="card-impression">{item.impression}</p>

              <div className="card-footer">
                <div className="card-tags">
                  {item.pathologies?.length > 0 ? (
                    item.pathologies.map((p, i) => (
                      <span key={i} className="card-tag">{p}</span>
                    ))
                  ) : (
                    <span className="card-tag card-tag--normal">Normal</span>
                  )}
                </div>
                {(item.confidence_score ?? item.confidence) && (
                  <span className="card-confidence">{item.confidence_score ?? item.confidence}% AI</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default HistoryPanel;