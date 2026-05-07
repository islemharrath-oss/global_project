import React, { useEffect, useState } from 'react';
import './PatientWorkspace.css';
import PatientAnalysisForm from './PatientAnalysisForm';
import ReportDisplay from './ReportDisplay';
import { getHistory, deleteAnalysis } from '../api';

// -- Transforms raw backend response into ReportDisplay format --
function buildReportForDisplay(data) {
  if (!data) return null;

  // -- Agent 1 : Classifier (ensemble fusion) --
  const classifierLabels = data.classifier_labels
    || data.labels
    || data.pathologies
    || [];

  // -- Agent 2 : MedGemma (confirmed labels + report) --
  const confirmedLabels = data.confirmed_labels || classifierLabels;
  const medicalReport   = data.medical_report || data.report || data.findings || '';

  // -- Agent 3 : Mistral (detailed explanation) --
  const mistralExplanation = data.mistral_explanation
    || data.patient_report
    || data.recommendations
    || 'No Mistral explanation available for this analysis.';

  // -- Agent 4 : CheXbert (verified final labels) --
  const finalLabels     = data.final_labels || confirmedLabels;
  const chexbertDetails = data.chexbert_details || {};

  // -- Sections displayed in ReportDisplay --
  const sections = [
    {
      title: 'Classifier Labels (Agent 1)',
      content: classifierLabels.length
        ? `Labels extracted by the CNN classifier (DenseNet + EfficientNet + ConvNeXt fusion):\n${classifierLabels.join(', ')}`
        : 'No labels extracted.',
    },
    {
      title: 'Confirmed Labels MedGemma (Agent 2)',
      content: confirmedLabels.length
        ? `Labels visually confirmed by MedGemma:\n${confirmedLabels.join(', ')}`
        : 'No confirmed labels.',
    },
    {
      title: 'MedGemma Report (Agent 2)',
      content: medicalReport || 'No report generated.',
    },
    {
      title: 'Patient Explanation (Agent 3)',
      content: mistralExplanation,
    },
    {
      title: 'CheXbert Labels (Agent 4)',
      content: finalLabels.length
        ? `Labels verified by CheXbert:\n${finalLabels.join(', ')}`
        : 'No CheXbert labels.',
    },
  ];

  return {
    sections,

    // Labels for LabelsSection
    labelsClassifier: classifierLabels,
    confirmedLabels:  confirmedLabels,
    labelsFinal:      finalLabels,
    chexbert_details: chexbertDetails,

    // Normal status
    is_normal: data.is_normal || false,

    // Confidence score
    confidence_score: data.confidence_score || null,

    // Images
    image_url: data.image_url || null,
    xai_image: data.xai_url   || data.xai_image || null,
    xai_url:   data.xai_url   || data.xai_image || null,

    // Raw text for copy/download
    raw_text: [
      `=== CLASSIFIER LABELS ===\n${classifierLabels.join(', ')}`,
      `\n=== CONFIRMED LABELS (MedGemma) ===\n${confirmedLabels.join(', ')}`,
      `\n=== MEDGEMMA REPORT ===\n${medicalReport}`,
      `\n=== PATIENT EXPLANATION (Mistral) ===\n${mistralExplanation}`,
      `\n=== CHEXBERT LABELS ===\n${finalLabels.join(', ')}`,
    ].join('\n'),

    // Backward-compatible report fields
    medical_report:      medicalReport,
    mistral_explanation: mistralExplanation,
    findings:            medicalReport,
    recommendations:     mistralExplanation,
    raw_report:          data.raw_report || '',

    // ReportDisplay compatibility
    pathologies: finalLabels,
    impression:  data.impression || (data.is_normal ? 'Normal' : finalLabels.join(', ')),
    xai_method:  'Grad-CAM',
  };
}

function PatientWorkspace({ patient }) {
  const [showUploader, setShowUploader]       = useState(false);
  const [patientHistory, setPatientHistory]   = useState([]);
  const [historyLoading, setHistoryLoading]   = useState(true);
  const [selectedReport, setSelectedReport]   = useState(null);
  const [report, setReport]                   = useState(null);
  const [isAnalyzing, setIsAnalyzing]         = useState(false);
  const [activeTab, setActiveTab]             = useState('report');

  const patientAge = patient.date_of_birth
    ? Math.max(0, new Date().getFullYear() - new Date(patient.date_of_birth).getFullYear())
    : null;

  useEffect(() => {
    const loadHistory = async () => {
      setHistoryLoading(true);
      try {
        const allHistory = await getHistory();
        const patientAnalyses = (allHistory.results || []).filter(
          (analysis) => analysis.patient_id === patient.id
        );
        setPatientHistory(patientAnalyses);

        if (patientAnalyses.length) {
          const latest = patientAnalyses[0];
          setSelectedReport(latest);
          setReport(buildReportForDisplay(latest));
          setActiveTab('report');
        } else {
          setSelectedReport(null);
          setReport(null);
          setActiveTab('identity');
        }
      } catch (err) {
        console.error('Failed to load patient history:', err);
      } finally {
        setHistoryLoading(false);
      }
    };

    loadHistory();
  }, [patient.id]);

  const handleReportGenerated = (newReport) => {
    setPatientHistory((prev) => [newReport, ...prev]);
    setSelectedReport(newReport);
    setShowUploader(false);
    setReport(buildReportForDisplay(newReport));
    setActiveTab('report');
  };

  const handleSelectReport = (analysis) => {
    setSelectedReport(analysis);
    setReport(buildReportForDisplay(analysis));
    setActiveTab('report');
  };

  const handleAnalysisStateChange = (loading) => {
    setIsAnalyzing(loading);
  };

  const handleDeleteReport = async (id) => {
    if (!window.confirm('Are you sure you want to delete this report?')) return;
    try {
      await deleteAnalysis(id);
      setPatientHistory((prev) => prev.filter((r) => r.id !== id));
      if (selectedReport?.id === id) {
        setSelectedReport(null);
        setReport(null);
      }
    } catch (err) {
      alert('Error during deletion: ' + err.message);
    }
  };

  return (
    <div className="patient-workspace">
      <div className="workspace-hero">
        <div className="workspace-hero__main">
          <span className="workspace-hero__eyebrow">Patient file</span>
          <h2>{patient.full_name || 'Unknown patient'}</h2>
          <p>
            {patient.medical_record_number
              ? `MRN ${patient.medical_record_number}`
              : 'Record number not available'}
            {patientAge !== null ? ` - ${patientAge} years old` : ''}
          </p>
        </div>
        <div className="workspace-hero__actions">
          <button
            className="btn-add-report"
            onClick={() => setShowUploader(!showUploader)}
          >
            {showUploader ? "Close analysis" : '+ Add a report'}
          </button>
        </div>
      </div>

      <div className="workspace-content">
        {/* Left : History */}
        <div className="content-left">
          <div className="history-section">
            <h3>Clinical history ({patientHistory.length})</h3>
            {historyLoading ? (
              <div className="loading">Loading...</div>
            ) : patientHistory.length === 0 ? (
              <div className="empty-history">
                <p>No reports recorded for this patient.</p>
                <button className="btn-first-report" onClick={() => setShowUploader(true)}>
                  Create the first report
                </button>
              </div>
            ) : (
              <div className="patient-report-list">
                {patientHistory.map((analysis) => (
                  <button
                    key={analysis.id}
                    type="button"
                    className={`patient-report-item ${selectedReport?.id === analysis.id ? 'active' : ''}`}
                    onClick={() => handleSelectReport(analysis)}
                  >
                    <div className="patient-report-item__top">
                      <span>{new Date(analysis.date).toLocaleString()}</span>
                    </div>
                    <p>{analysis.impression || 'No impression'}</p>
                    <div className="patient-report-item__actions">
                      <span>{(analysis.pathologies || []).join(', ') || 'Normal'}</span>
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(e) => { e.stopPropagation(); handleDeleteReport(analysis.id); }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault(); e.stopPropagation(); handleDeleteReport(analysis.id);
                          }
                        }}
                      >
                        Delete
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right : Tabs + Report */}
        <div className="content-right">
          <div className="workspace-tabs" role="tablist" aria-label="Patient file sections">
            <button
              type="button" role="tab"
              aria-selected={activeTab === 'identity'}
              className={`workspace-tab ${activeTab === 'identity' ? 'workspace-tab--active' : ''}`}
              onClick={() => setActiveTab('identity')}
            >
              Identity
            </button>
            <button
              type="button" role="tab"
              aria-selected={activeTab === 'history'}
              className={`workspace-tab ${activeTab === 'history' ? 'workspace-tab--active' : ''}`}
              onClick={() => setActiveTab('history')}
            >
              History
            </button>
            <button
              type="button" role="tab"
              aria-selected={activeTab === 'report'}
              className={`workspace-tab ${activeTab === 'report' ? 'workspace-tab--active' : ''}`}
              onClick={() => setActiveTab('report')}
            >
              Report
            </button>
          </div>

          {activeTab === 'identity' && (
            <div className="panel-card">
              <div className="patient-summary-grid">
                <div className="summary-card summary-card--wide">
                  <span className="summary-card__label">Patient name</span>
                  <div className="summary-card__value">{patient.full_name || 'Unknown patient'}</div>
                  <div className="summary-card__meta">Username: {patient.username || patient.user?.username || 'N/A'}</div>
                </div>
                <div className="summary-card">
                  <span className="summary-card__label">Record number</span>
                  <div className="summary-card__value">{patient.medical_record_number || 'N/A'}</div>
                </div>
                <div className="summary-card">
                  <span className="summary-card__label">Date of birth</span>
                  <div className="summary-card__value">
                    {patient.date_of_birth ? new Date(patient.date_of_birth).toLocaleDateString() : 'N/A'}
                  </div>
                </div>
                <div className="summary-card">
                  <span className="summary-card__label">Phone</span>
                  <div className="summary-card__value">{patient.phone || 'N/A'}</div>
                </div>
                <div className="summary-card summary-card--wide">
                  <span className="summary-card__label">Address</span>
                  <div className="summary-card__value summary-card__value--wrap">{patient.address || 'N/A'}</div>
                </div>
                <div className="summary-card summary-card--wide">
                  <span className="summary-card__label">Emergency contact</span>
                  <div className="summary-card__value summary-card__value--wrap">{patient.emergency_contact || 'N/A'}</div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="panel-card panel-card--history">
              {historyLoading ? (
                <div className="loading">Loading...</div>
              ) : patientHistory.length === 0 ? (
                <div className="tab-empty">No reports for this patient.</div>
              ) : (
                <div className="patient-report-list">
                  {patientHistory.map((analysis) => (
                    <button
                      key={`tab-history-${analysis.id}`}
                      type="button"
                      className={`patient-report-item ${selectedReport?.id === analysis.id ? 'active' : ''}`}
                      onClick={() => handleSelectReport(analysis)}
                    >
                      <div className="patient-report-item__top">
                        <span>{new Date(analysis.date).toLocaleString()}</span>
                      </div>
                      <p>{analysis.impression || 'No impression'}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'report' && (
            <div className="panel-card">
              <ReportDisplay
                report={report}
                labels={report?.labelsClassifier || []}
                isLoading={isAnalyzing}
                patientName={patient.full_name}
              />
            </div>
          )}
        </div>
      </div>

      {showUploader && (
        <div className="uploader-modal" role="dialog" aria-modal="true" aria-label="New analysis">
          <div className="uploader-modal__backdrop" onClick={() => setShowUploader(false)} />
          <div className="uploader-modal__content">
            <div className="uploader-modal__header">
              <h3>New radiological analysis</h3>
              <button type="button" className="uploader-modal__close" onClick={() => setShowUploader(false)}>
                Close
              </button>
            </div>
            <PatientAnalysisForm
              patientId={patient.id}
              onReportGenerated={handleReportGenerated}
              onAnalysisStateChange={handleAnalysisStateChange}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default PatientWorkspace;