import React, { useEffect, useState } from 'react';
import './PatientDashboard.css';
import PatientWorkspace from './PatientWorkspace';
import PatientCreator from './PatientCreator';

function PatientDashboard({ patients, onPatientCreated }) {
  const [selectedPatientId, setSelectedPatientId] = useState(null);
  const [showCreator, setShowCreator] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const selectedPatient = patients.find((p) => p.id === selectedPatientId);

  useEffect(() => {
    if (!patients.length) {
      setSelectedPatientId(null);
      return;
    }

    const selectedStillExists = patients.some((p) => p.id === selectedPatientId);
    if (!selectedStillExists) {
      setSelectedPatientId(patients[0].id);
    }
  }, [patients, selectedPatientId]);

  useEffect(() => {
    const syncSidebar = () => {
      if (window.innerWidth > 900) {
        setIsSidebarOpen(true);
      }
    };

    window.addEventListener('resize', syncSidebar);
    return () => window.removeEventListener('resize', syncSidebar);
  }, []);

  const handlePatientCreated = (newPatient) => {
    onPatientCreated(newPatient);
    setSelectedPatientId(newPatient?.patient?.id || null);
    setShowCreator(false);
  };

  const handleSelectPatient = (patientId) => {
    setSelectedPatientId(patientId);
    if (window.innerWidth <= 900) {
      setIsSidebarOpen(false);
    }
  };

  if (showCreator) {
    return (
      <div className="patient-dashboard">
        <div className="dashboard-header">
          <div>
            <h1>Nouveau dossier patient</h1>
            <p>Créer un patient relié au compte médecin.</p>
          </div>
          <button
            className="btn-back"
            onClick={() => setShowCreator(false)}
          >
            ← Retour aux dossiers
          </button>
        </div>
        <div className="creator-container">
          <PatientCreator onCreated={handlePatientCreated} />
        </div>
      </div>
    );
  }

  return (
    <div className="patient-dashboard">
      <div className={`dashboard-container ${!isSidebarOpen ? 'dashboard-container--sidebar-collapsed' : ''}`}>
        {/* Left Sidebar: Patient List */}
        <div className={`patients-sidebar ${!isSidebarOpen ? 'patients-sidebar--collapsed' : ''}`}>
          <div className="sidebar-header">
            <div className="sidebar-header__copy">
              <span className="sidebar-kicker">Dossiers patients</span>
              <h2>{patients.length} patient{patients.length > 1 ? 's' : ''}</h2>
            </div>
            <button
              className="btn-new-patient"
              onClick={() => setShowCreator(true)}
            >
              + Ajouter patient
            </button>
          </div>

          {patients.length === 0 ? (
            <div className="no-patients">
              <p>Aucun dossier patient disponible.</p>
              <button
                className="btn-create-first"
                onClick={() => setShowCreator(true)}
              >
                Créer un patient
              </button>
            </div>
          ) : (
            <div className="patients-list">
              {patients.map((patient) => (
                <div
                  key={patient.id}
                  className={`patient-item ${
                    selectedPatientId === patient.id ? 'active' : ''
                  }`}
                  onClick={() => handleSelectPatient(patient.id)}
                >
                  <div className="patient-item__badge">
                    {patient.full_name ? patient.full_name.split(' ')[0]?.[0] : 'P'}
                  </div>
                  <div className="patient-name">{patient.full_name || 'Unknown patient'}</div>
                  <div className="patient-mrn">
                    MRN: {patient.medical_record_number || 'N/A'}
                  </div>
                  {patient.date_of_birth && (
                    <div className="patient-dob">
                      DOB: {new Date(patient.date_of_birth).toLocaleDateString()}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Main Area: Patient Workspace */}
        <div className="workspace-area">
          <div className="workspace-toolbar">
            <button
              type="button"
              className="btn-show-patients"
              onClick={() => setIsSidebarOpen((prev) => !prev)}
            >
              {isSidebarOpen ? 'Masquer les patients' : 'Afficher les patients'}
            </button>
          </div>

          {selectedPatient ? (
            <PatientWorkspace
              patient={selectedPatient}
            />
          ) : (
            <div className="empty-workspace">
              <div className="empty-workspace__card">
                <span className="empty-workspace__label">Dossier patient</span>
                <p>Sélectionnez un patient pour afficher son identité, son historique et ses rapports.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default PatientDashboard;
