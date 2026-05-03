
import React, { useEffect, useState } from 'react';
import { adminGetDoctors, adminDeleteUser } from '../api';
import './AdminDashboard.css';

export default function AdminDashboard({ user, onLogout }) {
  const [doctors, setDoctors]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [expanded, setExpanded]     = useState(null);
  const [deleting, setDeleting]     = useState(null);
  const [search, setSearch]         = useState('');

  useEffect(() => { fetchDoctors(); }, []);

  const fetchDoctors = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await adminGetDoctors();
      setDoctors(data.results || []);
    } catch (err) {
      setError(err.message || 'Failed to load doctors');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId, name, type) => {
    if (!window.confirm(`Delete ${type} "${name}"? This action cannot be undone.`)) return;
    setDeleting(userId);
    try {
      await adminDeleteUser(userId);
      await fetchDoctors();
    } catch (err) {
      alert(err.message || 'Delete failed');
    } finally {
      setDeleting(null);
    }
  };

  const filtered = doctors.filter(d =>
    d.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    d.username?.toLowerCase().includes(search.toLowerCase()) ||
    d.specialty?.toLowerCase().includes(search.toLowerCase())
  );

  const totalPatients = doctors.reduce((sum, d) => sum + (d.patient_count || 0), 0);

  return (
    <div className="admin-shell">
      {/* Sidebar */}
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <span className="admin-brand-icon">⚕</span>
          <div>
            <p className="admin-brand-title">MedVision</p>
            <p className="admin-brand-sub">Admin Console</p>
          </div>
        </div>

        <div className="admin-profile">
          <div className="admin-avatar">{user?.username?.[0]?.toUpperCase() || 'A'}</div>
          <div>
            <p className="admin-profile-name">{user?.username || 'Admin'}</p>
            <p className="admin-profile-role">Administrator</p>
          </div>
        </div>

        <nav className="admin-nav">
          <button className="admin-nav-item admin-nav-item--active">
            <span>👥</span> Doctors & Patients
          </button>
        </nav>

        <button className="admin-logout" onClick={onLogout}>
          ← Logout
        </button>
      </aside>

      {/* Main */}
      <main className="admin-main">
        {/* Header */}
        <div className="admin-header">
          <div>
            <h1 className="admin-title">User Management</h1>
            <p className="admin-subtitle">Manage all doctors and their patients</p>
          </div>
          <button className="admin-refresh" onClick={fetchDoctors}>↻ Refresh</button>
        </div>

        {/* Stats */}
        <div className="admin-stats">
          <div className="admin-stat">
            <span className="admin-stat-value">{doctors.length}</span>
            <span className="admin-stat-label">Doctors</span>
          </div>
          <div className="admin-stat">
            <span className="admin-stat-value">{totalPatients}</span>
            <span className="admin-stat-label">Patients</span>
          </div>
          <div className="admin-stat">
            <span className="admin-stat-value">{doctors.length + totalPatients}</span>
            <span className="admin-stat-label">Total Users</span>
          </div>
        </div>

        {/* Search */}
        <div className="admin-search-wrap">
          <span className="admin-search-icon">🔍</span>
          <input
            className="admin-search"
            placeholder="Search by name, username or specialty..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Error */}
        {error && <div className="admin-error">⚠️ {error}</div>}

        {/* Loading */}
        {loading ? (
          <div className="admin-loading">
            <div className="admin-spinner" />
            <p>Loading users...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="admin-empty">
            <span>👤</span>
            <p>No doctors found</p>
          </div>
        ) : (
          <div className="admin-list">
            {filtered.map(doctor => (
              <div key={doctor.id} className="admin-doctor-card">
                {/* Doctor row */}
                <div className="admin-doctor-row">
                  <div className="admin-doctor-avatar">
                    {doctor.full_name?.[0] || doctor.username?.[0] || 'D'}
                  </div>
                  <div className="admin-doctor-info">
                    <p className="admin-doctor-name">
                      Dr. {doctor.full_name || doctor.username}
                    </p>
                    <p className="admin-doctor-meta">
                      <span className="admin-badge admin-badge--teal">{doctor.specialty || 'N/A'}</span>
                      <span className="admin-badge admin-badge--gray">{doctor.hospital || 'No hospital'}</span>
                    </p>
                    <p className="admin-doctor-sub">@{doctor.username} · {doctor.email}</p>
                  </div>
                  <div className="admin-doctor-actions">
                    <span className="admin-patient-count">
                      {doctor.patient_count || 0} patient{doctor.patient_count !== 1 ? 's' : ''}
                    </span>
                    {doctor.patient_count > 0 && (
                      <button
                        className="admin-btn admin-btn--ghost"
                        onClick={() => setExpanded(expanded === doctor.id ? null : doctor.id)}
                      >
                        {expanded === doctor.id ? '▲ Hide' : '▼ Show patients'}
                      </button>
                    )}
                    <button
                      className="admin-btn admin-btn--danger"
                      disabled={deleting === doctor.id}
                      onClick={() => handleDeleteUser(doctor.id, doctor.full_name || doctor.username, 'doctor')}
                    >
                      {deleting === doctor.id ? '...' : '🗑 Delete'}
                    </button>
                  </div>
                </div>

                {/* Patients list */}
                {expanded === doctor.id && doctor.patients?.length > 0 && (
                  <div className="admin-patients">
                    <p className="admin-patients-title">Patients of Dr. {doctor.full_name || doctor.username}</p>
                    <div className="admin-patients-grid">
                      {doctor.patients.map(patient => (
                        <div key={patient.id} className="admin-patient-card">
                          <div className="admin-patient-avatar">
                            {patient.full_name?.[0] || 'P'}
                          </div>
                          <div className="admin-patient-info">
                            <p className="admin-patient-name">{patient.full_name}</p>
                            <p className="admin-patient-mrn">MRN: {patient.medical_record_number}</p>
                            {patient.date_of_birth && (
                              <p className="admin-patient-dob">
                                DOB: {new Date(patient.date_of_birth).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                          <button
                            className="admin-btn admin-btn--danger admin-btn--sm"
                            disabled={deleting === patient.id}
                            onClick={() => handleDeleteUser(patient.id, patient.full_name, 'patient')}
                          >
                            {deleting === patient.id ? '...' : '🗑'}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}