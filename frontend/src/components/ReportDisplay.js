import React, { useState } from "react";
import XAIViewer from "./XAIViewer";
import "./ReportDisplay.css";

// ─── Pathology display names ─────────────────────────────────────────────────
const PATHOLOGY_LABELS = {
  "Atelectasis":                "Atelectasis",
  "Cardiomegaly":               "Cardiomegaly",
  "Effusion":                   "Pleural Effusion",
  "Infiltration":               "Pulmonary Infiltration",
  "Mass":                       "Pulmonary Mass",
  "Nodule":                     "Pulmonary Nodule",
  "Pneumonia":                  "Pneumonia",
  "Pneumothorax":               "Pneumothorax",
  "Consolidation":              "Consolidation",
  "Edema":                      "Pulmonary Edema",
  "Emphysema":                  "Emphysema",
  "Fibrosis":                   "Pulmonary Fibrosis",
  "Pleural_Thickening":         "Pleural Thickening",
  "Hernia":                     "Diaphragmatic Hernia",
  "No Finding":                 "No Finding",
  "Normal":                     "Normal",
  "Lung Opacity":               "Lung Opacity",
  "Lung Lesion":                "Lung Lesion",
  "Pleural Effusion":           "Pleural Effusion",
  "Enlarged Cardiomediastinum": "Enlarged Cardiomediastinum",
  "Support Devices":            "Support Devices",
  "Pleural Other":              "Other Pleural Abnormality",
  "Fracture":                   "Fracture",
};

function getLabel(name) {
  return PATHOLOGY_LABELS[name] || name;
}

function getSeverity(confidence) {
  if (confidence == null) return "medium";
  if (confidence >= 0.7)  return "high";
  if (confidence >= 0.4)  return "medium";
  return "low";
}

const SEVERITY_TEXT = { high: "Critical", medium: "Moderate", low: "Low" };

// ══════════════════════════════════════════════════
// Tab 1 — Detected Pathologies
// ══════════════════════════════════════════════════
function PathologiesTab({ report }) {
  const labels = report?.labelsFinal || report?.pathologies || report?.labelsClassifier || [];

  if (!labels || labels.length === 0) {
    return (
      <div className="pathologies-panel">
        <div className="pathologies-empty">
          No significant pathology detected on this radiograph.
        </div>
      </div>
    );
  }

  return (
    <div className="pathologies-panel">
      <div className="pathologies-grid">
        {labels.map((label, i) => {
          const name       = typeof label === "string" ? label : label.name;
          const confidence = typeof label === "string" ? null  : label.confidence;
          const sev        = getSeverity(confidence);

          return (
            <div key={i} className={`pathology-card pathology-card--${sev}`}>
              <div className="pathology-card-top">
                <span className="pathology-name">{getLabel(name)}</span>
                <span className={`severity-pill severity-pill--${sev}`}>
                  {SEVERITY_TEXT[sev]}
                </span>
              </div>
              {confidence != null && (
                <div className="pathology-confidence">
                  <div className="conf-bar-track">
                    <div
                      className="conf-bar-fill"
                      style={{ width: `${Math.round(confidence * 100)}%` }}
                    />
                  </div>
                  <span className="conf-pct">{Math.round(confidence * 100)}%</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <p className="pathologies-note">
        These results are generated automatically as a diagnostic aid.
        All clinical decisions remain the sole responsibility of the treating physician.
      </p>
    </div>
  );
}

// ══════════════════════════════════════════════════
// Technical content filters
// ══════════════════════════════════════════════════
const TECHNICAL_CONTENT_RE = [
  /labels?\s+extraits?\s+par\s+le\s+classifier[^:]*:\s*/gi,
  /labels?\s+confirm[eé]s?\s+visuellement\s+par\s+medgemma\s*:\s*/gi,
  /\(agent\s*\d+\)/gi,
  /medgemma\s*[:-]?\s*/gi,
  /chexbert\s*[:-]?\s*/gi,
  /classifier\s+cnn[^:]*:\s*/gi,
  /densenet\s*\+\s*efficientnet[^)]*\)/gi,
  /CONFIRMED:\s*\[.*?\]/gi,
];

function cleanContent(text = "") {
  let out = text;
  TECHNICAL_CONTENT_RE.forEach(re => { out = out.replace(re, ""); });
  return out.trim();
}

const SECTION_TITLE_RENAMES = [
  [/rapport\s+medgemma[^a-z]*/i, "Report"],
  [/rapport\s+mistral[^a-z]*/i,  "Report"],
  [/rapport\s+ia[^a-z]*/i,       "Report"],
  [/\(agent\s*\d+\)/gi,          ""],
];

function cleanTitle(title = "") {
  let out = title;
  SECTION_TITLE_RENAMES.forEach(([re, replacement]) => {
    out = out.replace(re, replacement);
  });
  return out.trim();
}

// ══════════════════════════════════════════════════
// Report section accordion
// ══════════════════════════════════════════════════
function ReportSection({ index, title, content, highlight }) {
  const [open, setOpen] = useState(true);
  if (!content) return null;

  const paragraphs = cleanContent(content)
    .split(/\n{2,}|\n(?=[-•*#])/)
    .map(p => p.trim())
    .filter(Boolean);

  return (
    <div className={`report-section${highlight ? " report-section--highlight" : ""}`}>
      <div className="report-section-header" onClick={() => setOpen(o => !o)}>
        <div className="section-header-left">
          <span className="section-num">{String(index).padStart(2, "0")}</span>
          <h3 className="section-title">{cleanTitle(title)}</h3>
        </div>
        <button className={`section-toggle-btn ${open ? "open" : ""}`}>
          {open ? "▲" : "▼"}
        </button>
      </div>

      {open && (
        <div className="section-body">
          {paragraphs.map((para, i) => {
            if (/^#{1,3}\s/.test(para)) {
              return (
                <h4 key={i} className="section-subheading">
                  {para.replace(/^#{1,3}\s*/, "")}
                </h4>
              );
            }
            if (/^[-•*]/.test(para)) {
              const items = para.split(/\n/).map(l => l.replace(/^[-•*]\s*/, "").trim()).filter(Boolean);
              return (
                <ul key={i} className="section-list">
                  {items.map((item, j) => (
                    <li key={j} className="section-list-item">{item}</li>
                  ))}
                </ul>
              );
            }
            return <p key={i} className="section-paragraph">{para}</p>;
          })}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════
// Tab 2 — Medical Report
// ══════════════════════════════════════════════════
const TECHNICAL_SECTION_PATTERNS = [
  /classifier/i,
  /agent\s*\d/i,
  /chexbert/i,
  /cnn/i,
  /labels?\s+confirm/i,
  /labels?\s+extract/i,
  /labels?\s+classif/i,
];

function isTechnicalSection(title = "") {
  const normalized = title.toLowerCase();
  if (/\b(report|rapport)\b/i.test(normalized)) {
    return false;
  }
  return TECHNICAL_SECTION_PATTERNS.some(re => re.test(title));
}

function ReportTab({ report, patientName }) {
  const [copied, setCopied] = useState(false);
  const allSections         = report?.sections || [];
  const sections            = allSections.filter(s => !isTechnicalSection(s.title));

  const reportSections = [];
  if (sections.length > 0) {
    reportSections.push(...sections);
  } else if (report.medical_report || report.findings) {
    reportSections.push({
      title:   "Medical Report",
      content: report.medical_report || report.findings,
    });
  }

  const mistralText = report.mistral_explanation || report.patient_report || report.recommendations || "";
  if (mistralText) {
    reportSections.push({ title: "Patient Explanation", content: mistralText, highlight: true });
  }

  const handleCopy = () => {
    const text = reportSections.map(s => `${s.title}\n${s.content}`).join("\n\n");
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    const originalTitle = document.title;
    const cleanName = (patientName || 'Patient').replace(/[^a-z0-9]/gi, '_');
    const date = new Date().toISOString().slice(0, 10);
    
    document.title = `Medical_Report_${cleanName}_${date}`;
    window.print();
    document.title = originalTitle;
  };

  return (
    <div className="report-panel">
      <div className="report-panel-header">
        <div>
          <h2 className="report-panel-title">Radiology Report</h2>
          <p className="report-panel-meta">
            {new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })}
          </p>
        </div>
        <div className="report-panel-actions">
          <button className="btn" onClick={handleCopy}>
            {copied ? "Copied" : "Copy"}
          </button>
          <button className="btn btn--primary" onClick={handlePrint}>
            Print Report (PDF)
          </button>
        </div>
      </div>

      <div className="report-sections">
        {reportSections.length > 0
          ? reportSections.map((s, i) => (
              <ReportSection
                key={i}
                index={i + 1}
                title={s.title}
                content={s.content}
                highlight={s.highlight || false}
              />
            ))
          : <div style={{ padding: "2rem 1.5rem", color: "var(--ink-soft)" }}>No report content available.</div>
        }
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════
// Printable Report Component
// ══════════════════════════════════════════════════
function PrintableReport({ report, patientName }) {
  if (!report) return null;
  const labels = report.labelsFinal || report.pathologies || [];
  const sections = (report.sections || []).filter(s => !isTechnicalSection(s.title));

  return (
    <div className="printable-report">
      <div className="print-header">
        <div className="print-header-brand">
          <span className="print-logo">⚕</span>
          <div>
            <h1>MedVision AI Analysis</h1>
            <p>Diagnostic Radiology Center</p>
          </div>
        </div>
        <div className="print-header-date">
          <p><strong>Report Date:</strong> {new Date().toLocaleDateString()}</p>
          <p><strong>Analysis ID:</strong> #{report.id || 'N/A'}</p>
        </div>
      </div>

      <div className="print-body">
        <section className="print-section">
          <h2 className="print-section-title">Analysis Summary</h2>
          <div className="print-summary-grid">
            <div className="print-summary-item">
              <strong>Status:</strong> {report.is_normal ? 'Normal' : 'Abnormalities Detected'}
            </div>
          </div>
        </section>

        <section className="print-section">
          <h2 className="print-section-title">Imaging Results</h2>
          <div className="print-images">
            <div className="print-image-wrap">
              <p>Original X-Ray</p>
              <img src={report.image_url} alt="X-Ray" />
            </div>
            {report.xai_image && (
              <div className="print-image-wrap">
                <p>AI Attention Heatmap</p>
                <img src={report.xai_image} alt="Heatmap" />
              </div>
            )}
          </div>
        </section>

        <section className="print-section">
          <h2 className="print-section-title">Detected Pathologies</h2>
          <div className="print-labels">
            {labels.length > 0 ? (
              labels.map((l, i) => (
                <span key={i} className="print-label-badge">{typeof l === 'string' ? l : l.name}</span>
              ))
            ) : (
              <p>No significant pathology detected.</p>
            )}
          </div>
        </section>

        <section className="print-section">
          <h2 className="print-section-title">Medical Findings</h2>
          {sections.map((s, i) => (
            <div key={i} className="print-report-block">
              <h3>{cleanTitle(s.title)}</h3>
              <p>{cleanContent(s.content)}</p>
            </div>
          ))}
          {!sections.length && report.medical_report && (
             <div className="print-report-block">
               <h3>Radiologist Report</h3>
               <p>{report.medical_report}</p>
             </div>
          )}
        </section>

        <section className="print-section">
          <h2 className="print-section-title">Patient Explanation</h2>
          <div className="print-report-block print-report-block--highlight">
            <p>{report.mistral_explanation || report.recommendations}</p>
          </div>
        </section>
      </div>

      <div className="print-footer">
        <p>DISCLAIMER: This report is AI-generated and intended for clinical support. Final diagnosis must be performed by a qualified physician.</p>
        <p>&copy; {new Date().getFullYear()} MedVision AI Medical Systems</p>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════
// Tab 3 — Imaging
// ══════════════════════════════════════════════════
function ImagingTab({ report }) {
  const [view, setView]       = useState("overlay");
  const [opacity, setOpacity] = useState(70);

  const originalImage = report?.image_url   || report?.image     || report?.imageUrl  || null;
  const xaiImage      = report?.xai_url     || report?.xai_image || report?.xaiImage  || null;
  const finalLabels   = report?.labelsFinal || report?.pathologies || [];

  if (!originalImage && !xaiImage) {
    return (
      <div className="imaging-panel">
        <div className="imaging-no-data">
          <span>No imaging data available for this analysis.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="imaging-panel">
      <div className="imaging-card">
        <div className="imaging-card-header">
          <span className="imaging-card-title">Chest X-Ray</span>
          {originalImage && xaiImage && (
            <div className="imaging-view-toggle">
              <button
                className={`view-toggle-btn ${view === "base" ? "view-toggle-btn--active" : ""}`}
                onClick={() => setView("base")}
              >
                Original
              </button>
              <button
                className={`view-toggle-btn ${view === "heatmap" ? "view-toggle-btn--active" : ""}`}
                onClick={() => setView("heatmap")}
              >
                Active Regions
              </button>
              <button
                className={`view-toggle-btn ${view === "overlay" ? "view-toggle-btn--active" : ""}`}
                onClick={() => setView("overlay")}
              >
                Overlay
              </button>
            </div>
          )}
        </div>

        <div className="imaging-viewer">
          {originalImage ? (
            <>
              <img
                className="imaging-img"
                src={originalImage}
                alt="Original radiograph"
              />
              {xaiImage && view !== "base" && (
                <img
                  className="imaging-img--overlay"
                  src={xaiImage}
                  alt="Regions of interest"
                  style={{ opacity: view === "heatmap" ? 1 : opacity / 100 }}
                />
              )}
            </>
          ) : (
            <div className="imaging-pending">
              <div className="imaging-scan-grid" />
              <span>Image not available</span>
            </div>
          )}
        </div>

        {xaiImage && view === "overlay" && (
          <div className="imaging-opacity-bar">
            <span className="opacity-label">Overlay opacity</span>
            <input
              type="range"
              min={0}
              max={100}
              value={opacity}
              onChange={e => setOpacity(Number(e.target.value))}
              className="opacity-slider"
            />
            <span className="opacity-value">{opacity}%</span>
          </div>
        )}

        {finalLabels.length > 0 && (
          <div className="imaging-zones">
            <span className="imaging-zone-label">Regions of interest:</span>
            {finalLabels.map((l, i) => {
              const name = typeof l === "string" ? l : l.name;
              return <span key={i} className="zone-tag">{getLabel(name)}</span>;
            })}
          </div>
        )}

        {xaiImage && (
          <div className="imaging-legend">
            <div className="legend-item">
              <span className="legend-dot" style={{ background: "#ff3b3b" }} />
              High activation
            </div>
            <div className="legend-item">
              <span className="legend-dot" style={{ background: "#ff9900" }} />
              Moderate activation
            </div>
            <div className="legend-item">
              <span className="legend-dot" style={{ background: "#00c8b0" }} />
              Low activation
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════
// Main component
// ══════════════════════════════════════════════════
export default function ReportDisplay({ report, labels, isLoading, error, patientName }) {
  const [activeTab, setActiveTab] = useState("pathologies");

  if (isLoading) {
    return (
      <div className="report-container">
        <div className="report-loading">
          <div className="loading-pulse" />
          <p className="loading-title">Analysis in progress...</p>
          <p className="loading-sub">Please wait</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="report-container">
        <div className="report-error">
          <p className="error-title">Analysis error</p>
          <p className="error-msg">{error}</p>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="report-container report-container--empty">
        <div className="report-placeholder">
          <div className="placeholder-icon-wrap" />
          <p className="placeholder-title">No analysis available</p>
          <p className="placeholder-sub">
            Upload a radiograph and run the analysis to display results.
          </p>
        </div>
      </div>
    );
  }

  const finalLabels = report.labelsFinal || report.pathologies || report.labelsClassifier || [];
  const isNormal    = report.is_normal || false;

  const highCount = finalLabels.filter(l => {
    const c = typeof l === "string" ? null : l.confidence;
    return getSeverity(c) === "high";
  }).length;

  const TABS = [
    {
      id:    "pathologies",
      label: "Findings",
      badge: finalLabels.length,
      alert: highCount > 0,
    },
    {
      id:    "rapport",
      label: "Report",
    },
    {
      id:    "imagerie",
      label: "Imaging",
    },
  ];

  return (
    <div className="report-container">

      <div className={`status-banner ${isNormal ? "status-banner--normal" : "status-banner--alert"}`}>
        <div className="status-dot" />
        <div className="status-text">
          <span className="status-label">
            {isNormal ? "Normal radiograph" : "Abnormalities detected"}
          </span>
          <span className="status-sub">
            {isNormal
              ? "No significant pathology identified"
              : `${finalLabels.length} finding${finalLabels.length > 1 ? "s" : ""} identified${highCount ? ` — ${highCount} critical` : ""}`
            }
          </span>
        </div>
      </div>

      <nav className="report-tabs-nav">
        {TABS.map(tab => (
          <button
            key={tab.id}
            className={`tab-btn ${activeTab === tab.id ? "tab-btn--active" : ""}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
            {tab.badge != null && tab.badge > 0 && (
              <span className={`tab-badge ${tab.alert ? "tab-badge--alert" : ""}`}>
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </nav>

      <div className="tab-panel">
        {activeTab === "pathologies" && <PathologiesTab report={report} />}
        {activeTab === "rapport"     && <ReportTab      report={report} patientName={patientName} />}
        {activeTab === "imagerie"    && <ImagingTab     report={report} />}
      </div>

      {/* Hidden on screen, visible on print */}
      <PrintableReport report={report} patientName={patientName} />

    </div>
  );
}