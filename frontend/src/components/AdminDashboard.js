
import React, { useEffect, useState } from 'react';
import { 
  adminGetDoctors, adminDeleteUser, adminCreateDoctor, adminUpdateDoctor, 
  adminAssignPatient, adminCreatePatient, adminUpdatePatient 
} from '../api';
import './AdminDashboard.css';

const doctorInitial = {
  username: '', password: '', email: '', first_name: '', last_name: '',
  specialty: '', license_number: '', hospital: '', phone: '',
};

const patientInitial = {
  username: '', password: '', email: '', first_name: '', last_name: '',
  medical_record_number: '', date_of_birth: '', phone: '', address: '',
  emergency_contact: '', doctor_id: ''
};

export default function AdminDashboard({ user, onLogout }) {
  const [doctors, setDoctors]       = useState([]);
  const [unassigned, setUnassigned] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [expanded, setExpanded]     = useState(null);
  const [deleting, setDeleting]     = useState(null);
  const [search, setSearch]         = useState('');

  // Modals state
  const [showModal, setShowModal]   = useState(null); // 'create_doc' | 'edit_doc' | 'create_pat' | 'edit_pat'
  const [formDoc, setFormDoc]       = useState(doctorInitial);
  const [formPat, setFormPat]       = useState(patientInitial);
  const [selectedEntity, setSelectedEntity] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { fetchDoctors(); }, []);

  const fetchDoctors = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await adminGetDoctors();
      setDoctors(data.results || []);
      setUnassigned(data.unassigned_patients || []);
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

  const handleAssignPatient = async (patientId, doctorId) => {
    if (!doctorId) return;
    try {
      await adminAssignPatient(patientId, doctorId);
      await fetchDoctors();
    } catch (err) {
      alert(err.message || 'Assignment failed');
    }
  };

  const handleOpenEditDoc = (doctor) => {
    setSelectedEntity(doctor);
    setFormDoc({
      username: doctor.username,
      email: doctor.email || '',
      first_name: doctor.first_name || '',
      last_name: doctor.last_name || '',
      specialty: doctor.specialty || '',
      license_number: doctor.license_number || '',
      hospital: doctor.hospital || '',
      phone: doctor.phone || '',
      password: '',
    });
    setShowModal('edit_doc');
  };

  const handleOpenEditPat = (patient) => {
    setSelectedEntity(patient);
    setFormPat({
      username: patient.username || '',
      email: patient.email || '',
      first_name: patient.first_name || '',
      last_name: patient.last_name || '',
      medical_record_number: patient.medical_record_number || '',
      date_of_birth: patient.date_of_birth || '',
      phone: patient.phone || '',
      address: patient.address || '',
      emergency_contact: patient.emergency_contact || '',
      doctor_id: patient.doctor || '',
      password: '',
    });
    setShowModal('edit_pat');
  };

  const handleSubmitDoc = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (showModal === 'create_doc') {
        await adminCreateDoctor(formDoc);
      } else {
        const payload = { ...formDoc };
        if (!payload.password) delete payload.password;
        await adminUpdateDoctor(selectedEntity.id, payload);
      }
      setShowModal(null);
      await fetchDoctors();
    } catch (err) {
      alert(err.message || 'Operation failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitPat = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (showModal === 'create_pat') {
        await adminCreatePatient(formPat);
      } else {
        const payload = { ...formPat };
        if (!payload.password) delete payload.password;
        await adminUpdatePatient(selectedEntity.id, payload);
      }
      setShowModal(null);
      await fetchDoctors();
    } catch (err) {
      alert(err.message || 'Operation failed');
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = doctors.filter(d =>
    d.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    d.username?.toLowerCase().includes(search.toLowerCase()) ||
    d.specialty?.toLowerCase().includes(search.toLowerCase())
  );

  const totalPatients = doctors.reduce((sum, d) => sum + (d.patient_count || 0), 0) + unassigned.length;

  return (
    <div className="admin-shell">
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
          <div><p className="admin-profile-name">{user?.username || 'Admin'}</p><p className="admin-profile-role">Administrator</p></div>
        </div>
        <nav className="admin-nav">
          <button className="admin-nav-item admin-nav-item--active"><span>👥</span> Users Management</button>
        </nav>
        <button className="admin-logout" onClick={onLogout}>← Logout</button>
      </aside>

      <main className="admin-main">
        <div className="admin-header">
          <div><h1 className="admin-title">Users Management</h1><p className="admin-subtitle">Manage all medical staff and registered patients</p></div>
          <div className="admin-actions">
            <button className="admin-btn admin-btn--primary" onClick={() => { setFormDoc(doctorInitial); setShowModal('create_doc'); }}>+ Doctor</button>
            <button className="admin-btn admin-btn--primary" onClick={() => { setFormPat(patientInitial); setShowModal('create_pat'); }}>+ Patient</button>
            <button className="admin-refresh" onClick={fetchDoctors}>↻ Refresh</button>
          </div>
        </div>

        <div className="admin-stats">
          <div className="admin-stat"><span className="admin-stat-value">{doctors.length}</span><span className="admin-stat-label">Doctors</span></div>
          <div className="admin-stat"><span className="admin-stat-value">{totalPatients}</span><span className="admin-stat-label">Total Patients</span></div>
          <div className="admin-stat"><span className="admin-stat-value">{unassigned.length}</span><span className="admin-stat-label">Unassigned</span></div>
        </div>

        <div className="admin-search-wrap">
          <span className="admin-search-icon">🔍</span>
          <input className="admin-search" placeholder="Search by name, MRN, username..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {error && <div className="admin-error">⚠️ {error}</div>}

        {loading ? (
          <div className="admin-loading"><div className="admin-spinner" /><p>Loading users...</p></div>
        ) : (
          <div className="admin-list">
            {/* UNASSIGNED PATIENTS */}
            {unassigned.length > 0 && (
              <div className="admin-doctor-card admin-doctor-card--warning">
                <div className="admin-doctor-row" style={{background: '#fff9f0'}}>
                  <div className="admin-doctor-avatar" style={{background: '#fff3e0', color: '#f57c00', borderColor: '#ffe0b2'}}>⚠️</div>
                  <div className="admin-doctor-info">
                    <p className="admin-doctor-name">Unassigned Patients</p>
                    <p className="admin-doctor-sub">{unassigned.length} patients need a doctor assignment.</p>
                  </div>
                  <div className="admin-doctor-actions">
                    <button className="admin-btn admin-btn--ghost" onClick={() => setExpanded(expanded === 'unassigned' ? null : 'unassigned')}>
                      {expanded === 'unassigned' ? '▲ Hide' : '▼ Manage Orphans'}
                    </button>
                  </div>
                </div>
                {expanded === 'unassigned' && (
                  <div className="admin-patients">
                    <div className="admin-patients-grid">
                      {unassigned.map(patient => (
                        <div key={patient.id} className="admin-patient-card">
                          <div className="admin-patient-avatar">{patient.full_name?.[0]}</div>
                          <div className="admin-patient-info">
                            <p className="admin-patient-name">{patient.full_name}</p>
                            <select className="admin-assign-select" onChange={(e) => handleAssignPatient(patient.id, e.target.value)} defaultValue="">
                              <option value="" disabled>Assign to doctor...</option>
                              {doctors.map(d => <option key={d.id} value={d.id}>Dr. {d.full_name || d.username}</option>)}
                            </select>
                          </div>
                          <div className="admin-entity-controls">
                            <button className="admin-btn admin-btn--ghost admin-btn--sm" onClick={() => handleOpenEditPat(patient)}>✎</button>
                            <button className="admin-btn admin-btn--danger admin-btn--sm" disabled={deleting === patient.id} onClick={() => handleDeleteUser(patient.id, patient.full_name, 'patient')}>
                              {deleting === patient.id ? '...' : '🗑'}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* DOCTOR LIST */}
            {filtered.map(doctor => (
              <div key={doctor.id} className="admin-doctor-card">
                <div className="admin-doctor-row">
                  <div className="admin-doctor-avatar">{doctor.full_name?.[0] || 'D'}</div>
                  <div className="admin-doctor-info">
                    <p className="admin-doctor-name">Dr. {doctor.full_name || doctor.username}</p>
                    <p className="admin-doctor-meta">
                      <span className="admin-badge admin-badge--teal">{doctor.specialty}</span>
                      <span className="admin-badge admin-badge--gray">{doctor.hospital}</span>
                    </p>
                    <p className="admin-doctor-sub">@{doctor.username} · {doctor.email} · {doctor.phone || 'No phone'}</p>
                  </div>
                  <div className="admin-doctor-actions">
                    <button className="admin-btn admin-btn--ghost" onClick={() => handleOpenEditDoc(doctor)}>✎ Edit</button>
                    <button className="admin-btn admin-btn--ghost" onClick={() => setExpanded(expanded === doctor.id ? null : doctor.id)}>
                      {expanded === doctor.id ? '▲ Hide' : '▼ Patients (' + (doctor.patient_count || 0) + ')'}
                    </button>
                    <button className="admin-btn admin-btn--danger" disabled={deleting === doctor.id} onClick={() => handleDeleteUser(doctor.id, doctor.full_name || doctor.username, 'doctor')}>
                      {deleting === doctor.id ? '...' : '🗑'}
                    </button>
                  </div>
                </div>
                {expanded === doctor.id && (
                  <div className="admin-patients">
                    <div className="admin-patients-grid">
                      {doctor.patients?.map(p => (
                        <div key={p.id} className="admin-patient-card">
                          <div className="admin-patient-avatar">{p.full_name?.[0]}</div>
                          <div className="admin-patient-info">
                            <p className="admin-patient-name">{p.full_name}</p>
                            <p className="admin-patient-mrn">MRN: {p.medical_record_number}</p>
                          </div>
                          <div className="admin-entity-controls">
                            <button className="admin-btn admin-btn--ghost admin-btn--sm" onClick={() => handleOpenEditPat(p)}>✎</button>
                            <button className="admin-btn admin-btn--danger admin-btn--sm" disabled={deleting === p.id} onClick={() => handleDeleteUser(p.id, p.full_name, 'patient')}>
                              {deleting === p.id ? '...' : '🗑'}
                            </button>
                          </div>
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

      {/* DOCTOR MODAL */}
      {(showModal === 'create_doc' || showModal === 'edit_doc') && (
        <div className="admin-modal-overlay">
          <div className="admin-modal">
            <div className="admin-modal-header">
              <h2>{showModal === 'create_doc' ? 'Register Doctor' : 'Update Doctor'}</h2>
              <button className="admin-modal-close" onClick={() => setShowModal(null)}>×</button>
            </div>
            <form onSubmit={handleSubmitDoc}>
              <div className="admin-modal-body">
                <div className="admin-form-grid">
                  <div className="admin-form-field"><label>Username</label><input disabled={showModal === 'edit_doc'} value={formDoc.username} onChange={e => setFormDoc({...formDoc, username: e.target.value})} required /></div>
                  <div className="admin-form-field"><label>Password {showModal === 'edit_doc' && '(empty = same)'}</label><input type="password" value={formDoc.password} onChange={e => setFormDoc({...formDoc, password: e.target.value})} required={showModal === 'create_doc'}/></div>
                  <div className="admin-form-field"><label>First Name</label><input value={formDoc.first_name} onChange={e => setFormDoc({...formDoc, first_name: e.target.value})} /></div>
                  <div className="admin-form-field"><label>Last Name</label><input value={formDoc.last_name} onChange={e => setFormDoc({...formDoc, last_name: e.target.value})} /></div>
                  <div className="admin-form-field admin-full-width"><label>Email</label><input type="email" value={formDoc.email} onChange={e => setFormDoc({...formDoc, email: e.target.value})} /></div>
                  <div className="admin-form-field"><label>Specialty</label><input value={formDoc.specialty} onChange={e => setFormDoc({...formDoc, specialty: e.target.value})} required /></div>
                  <div className="admin-form-field"><label>License</label><input value={formDoc.license_number} onChange={e => setFormDoc({...formDoc, license_number: e.target.value})} required /></div>
                  <div className="admin-form-field"><label>Hospital</label><input value={formDoc.hospital} onChange={e => setFormDoc({...formDoc, hospital: e.target.value})} /></div>
                  <div className="admin-form-field"><label>Phone</label><input value={formDoc.phone} onChange={e => setFormDoc({...formDoc, phone: e.target.value})} /></div>
                </div>
              </div>
              <div className="admin-modal-footer">
                <button type="button" className="admin-btn admin-btn--ghost" onClick={() => setShowModal(null)}>Cancel</button>
                <button type="submit" className="admin-btn admin-btn--primary" disabled={submitting}>Save Doctor</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PATIENT MODAL */}
      {(showModal === 'create_pat' || showModal === 'edit_pat') && (
        <div className="admin-modal-overlay">
          <div className="admin-modal">
            <div className="admin-modal-header">
              <h2>{showModal === 'create_pat' ? 'Register Patient' : 'Update Patient'}</h2>
              <button className="admin-modal-close" onClick={() => setShowModal(null)}>×</button>
            </div>
            <form onSubmit={handleSubmitPat}>
              <div className="admin-modal-body">
                <div className="admin-form-grid">
                  <div className="admin-form-field"><label>Username</label><input disabled={showModal === 'edit_pat'} value={formPat.username} onChange={e => setFormPat({...formPat, username: e.target.value})} required /></div>
                  <div className="admin-form-field"><label>Password {showModal === 'edit_pat' && '(empty = same)'}</label><input type="password" value={formPat.password} onChange={e => setFormPat({...formPat, password: e.target.value})} required={showModal === 'create_pat'}/></div>
                  <div className="admin-form-field"><label>First Name</label><input value={formPat.first_name} onChange={e => setFormPat({...formPat, first_name: e.target.value})} required /></div>
                  <div className="admin-form-field"><label>Last Name</label><input value={formPat.last_name} onChange={e => setFormPat({...formPat, last_name: e.target.value})} required /></div>
                  <div className="admin-form-field"><label>MRN (Medical Record #)</label><input value={formPat.medical_record_number} onChange={e => setFormPat({...formPat, medical_record_number: e.target.value})} required /></div>
                  <div className="admin-form-field"><label>Birth Date</label><input type="date" value={formPat.date_of_birth} onChange={e => setFormPat({...formPat, date_of_birth: e.target.value})} /></div>
                  <div className="admin-form-field"><label>Assigned Doctor</label>
                    <select value={formPat.doctor_id} onChange={e => setFormPat({...formPat, doctor_id: e.target.value})}>
                      <option value="">None (Unassigned)</option>
                      {doctors.map(d => <option key={d.id} value={d.id}>Dr. {d.full_name || d.username}</option>)}
                    </select>
                  </div>
                  <div className="admin-form-field"><label>Phone</label><input value={formPat.phone} onChange={e => setFormPat({...formPat, phone: e.target.value})} /></div>
                  <div className="admin-form-field admin-full-width"><label>Address</label><input value={formPat.address} onChange={e => setFormPat({...formPat, address: e.target.value})} /></div>
                  <div className="admin-form-field admin-full-width"><label>Emergency Contact</label><input value={formPat.emergency_contact} onChange={e => setFormPat({...formPat, emergency_contact: e.target.value})} /></div>
                </div>
              </div>
              <div className="admin-modal-footer">
                <button type="button" className="admin-btn admin-btn--ghost" onClick={() => setShowModal(null)}>Cancel</button>
                <button type="submit" className="admin-btn admin-btn--primary" disabled={submitting}>Save Patient</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}