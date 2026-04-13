import React, { useEffect, useState } from 'react';
import './PatientWorkspace.css';
import PatientAnalysisForm from './PatientAnalysisForm';
import ReportDisplay from './ReportDisplay';
import { getHistory, deleteAnalysis } from '../api';

function PatientWorkspace({ patient }) {
  const [showUploader, setShowUploader] = useState(false);
  const [patientHistory, setPatientHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState(null);
  const [report, setReport] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeTab, setActiveTab] = useState('report');

  const patientAge = patient.date_of_birth
    ? Math.max(0, new Date().getFullYear() - new Date(patient.date_of_birth).getFullYear())
    : null;

  // Load patient's analysis history
  useEffect(() => {
    const loadHistory = async () => {
      setHistoryLoading(true);
      try {
        const allHistory = await getHistory();
        // Filter for this patient only
        const patientAnalyses = (allHistory.results || []).filter(
          (analysis) => analysis.patient_id === patient.id
        );
        setPatientHistory(patientAnalyses);

        if (patientAnalyses.length) {
          const latest = patientAnalyses[0];
          setSelectedReport(latest);
          setReport(latest);
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
    // Add new report to history
    setPatientHistory((prev) => [newReport, ...prev]);
    setSelectedReport(newReport);
    setShowUploader(false);
    setReport(newReport);
    setActiveTab('report');
  };

  const handleSelectReport = (analysis) => {
    setSelectedReport(analysis);
    setReport(analysis);
    setActiveTab('report');
  };

  const handleAnalysisStateChange = (loading) => {
    setIsAnalyzing(loading);
  };

  const handleDeleteReport = async (id) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce rapport?')) {
      return;
    }
    try {
      await deleteAnalysis(id);
      setPatientHistory((prev) => prev.filter((r) => r.id !== id));
      if (selectedReport?.id === id) {
        setSelectedReport(null);
        setReport(null);
      }
    } catch (err) {
      alert('Erreur lors de la suppression: ' + err.message);
    }
  };

  return (
    <div className="patient-workspace">
      <div className="workspace-hero">
        <div className="workspace-hero__main">
          <span className="workspace-hero__eyebrow">Patient dossier</span>
          <h2>{patient.full_name || 'Unknown patient'}</h2>
          <p>
            {patient.medical_record_number ? `MRN ${patient.medical_record_number}` : 'Medical record number unavailable'}
            {patientAge !== null ? ` • ${patientAge} years` : ''}
          </p>
        </div>
        <div className="workspace-hero__actions">
          <button
            className="btn-add-report"
            onClick={() => setShowUploader(!showUploader)}
          >
            {showUploader ? 'Fermer l’analyse' : '+ Ajouter un rapport'}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="workspace-content">
        {/* Left Side: Report History */}
        <div className="content-left">
          <div className="history-section">
            <h3>Historique clinique ({patientHistory.length})</h3>
            {historyLoading ? (
              <div className="loading">Chargement...</div>
            ) : patientHistory.length === 0 ? (
              <div className="empty-history">
                <p>Aucun rapport enregistré pour ce patient.</p>
                <button
                  className="btn-first-report"
                  onClick={() => setShowUploader(true)}
                >
                  Créer le premier rapport
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
                      <span>{Math.round(analysis.confidence_score || 0)}%</span>
                    </div>
                    <p>{analysis.impression || 'Aucune impression'}</p>
                    <div className="patient-report-item__actions">
                      <span>{(analysis.pathologies || []).join(', ') || 'Normal'}</span>
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteReport(analysis.id);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            e.stopPropagation();
                            handleDeleteReport(analysis.id);
                          }
                        }}
                      >
                        Supprimer
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Report Display */}
        <div className="content-right">
          <div className="workspace-tabs" role="tablist" aria-label="Patient dossier sections">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'identity'}
              className={`workspace-tab ${activeTab === 'identity' ? 'workspace-tab--active' : ''}`}
              onClick={() => setActiveTab('identity')}
            >
              Identity
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'history'}
              className={`workspace-tab ${activeTab === 'history' ? 'workspace-tab--active' : ''}`}
              onClick={() => setActiveTab('history')}
            >
              History
            </button>
            <button
              type="button"
              role="tab"
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
                <div className="loading">Chargement...</div>
              ) : patientHistory.length === 0 ? (
                <div className="tab-empty">No reports yet for this patient.</div>
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
                        <span>{Math.round(analysis.confidence_score || 0)}%</span>
                      </div>
                      <p>{analysis.impression || 'Aucune impression'}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'report' && (
            <div className="panel-card">
              <ReportDisplay report={report} isLoading={isAnalyzing} />
            </div>
          )}

        </div>
      </div>

      {showUploader && (
        <div className="uploader-modal" role="dialog" aria-modal="true" aria-label="Nouvelle analyse">
          <div className="uploader-modal__backdrop" onClick={() => setShowUploader(false)} />
          <div className="uploader-modal__content">
            <div className="uploader-modal__header">
              <h3>Nouvelle analyse radiologique</h3>
              <button
                type="button"
                className="uploader-modal__close"
                onClick={() => setShowUploader(false)}
              >
                Fermer
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
