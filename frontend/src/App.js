import React, { useEffect, useState } from 'react';
import './App.css';
import Header from './components/Header';
import AuthPage from './components/AuthPage';
import PatientDashboard from './components/PatientDashboard';
import AboutPage from './components/AboutPage';
import AdminDashboard from './components/AdminDashboard';
import PatientPortal from './components/PatientPortal';

import {
  clearAuthTokens,
  getCurrentUser,
  getPatients,
  getStoredUserTokens,
  loginUser,
  registerDoctor,
} from './api';

function App() {
  const [activePage, setActivePage] = useState('dashboard');
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState('');
  const [user, setUser] = useState(null);
  const [patients, setPatients] = useState([]);

  // ── Determine role ──────────────────────────────────────────────────────
  const getRole = (u) => {
    if (!u) return null;
    if (u.is_staff || u.role === 'admin') return 'admin';
    if (u.role === 'patient' || u.patient_profile) return 'patient';
    if (u.role === 'doctor' || u.doctor_profile) return 'doctor';
    return 'doctor'; // fallback
  };

  const role = getRole(user);

  // ── Load patients (doctor only) ─────────────────────────────────────────
  const loadPatients = async () => {
    try {
      const data = await getPatients();
      setPatients(Array.isArray(data) ? data : (data.results || []));
    } catch (err) {
      console.error('Patient fetch error:', err);
    }
  };

  // ── Bootstrap session ────────────────────────────────────────────────────
  useEffect(() => {
    const bootstrap = async () => {
      const tokens = getStoredUserTokens();
      if (!tokens.access) { setAuthLoading(false); return; }
      try {
        const me = await getCurrentUser();
        setUser(me);
        if (getRole(me) === 'doctor') await loadPatients();
      } catch (err) {
        console.error('Session restore failed:', err);
        clearAuthTokens();
      } finally {
        setAuthLoading(false);
      }
    };
    bootstrap();
  }, []);

  // ── Login ────────────────────────────────────────────────────────────────
  const handleLogin = async ({ username, password }) => {
    setAuthLoading(true);
    setAuthError('');
    try {
      await loginUser(username, password);
      const me = await getCurrentUser();
      setUser(me);
      if (getRole(me) === 'doctor') await loadPatients();
      setActivePage('dashboard');
    } catch (err) {
      setAuthError(err.message || 'Login failed');
    } finally {
      setAuthLoading(false);
    }
  };

  // ── Register (doctor only) ───────────────────────────────────────────────
  const handleRegister = async (payload) => {
    setAuthLoading(true);
    setAuthError('');
    try {
      const data = await registerDoctor(payload);
      setUser(data.user || null);
      await loadPatients();
      setActivePage('dashboard');
    } catch (err) {
      setAuthError(err.message || 'Registration failed');
    } finally {
      setAuthLoading(false);
    }
  };

  // ── Logout ───────────────────────────────────────────────────────────────
  const handleLogout = () => {
    clearAuthTokens();
    setUser(null);
    setPatients([]);
    setActivePage('dashboard');
  };

  const handlePatientCreated = async () => { await loadPatients(); };

  // ── Loading screen ───────────────────────────────────────────────────────
  if (authLoading) {
    return (
      <div className="auth-shell">
        <div className="auth-card">
          <h2>Loading MedVision...</h2>
        </div>
      </div>
    );
  }

  // ── Not logged in ────────────────────────────────────────────────────────
  if (!user) {
    return (
      <AuthPage
        onLogin={handleLogin}
        onRegister={handleRegister}
        isLoading={authLoading}
        error={authError}
      />
    );
  }

  // ── ADMIN interface ──────────────────────────────────────────────────────
  if (role === 'admin') {
    return (
      <AdminDashboard
        user={user}
        onLogout={handleLogout}
      />
    );
  }

  // ── PATIENT interface ────────────────────────────────────────────────────
  if (role === 'patient') {
    return (
      <PatientPortal
        user={user}
        onLogout={handleLogout}
      />
    );
  }

  // ── DOCTOR interface (default) ───────────────────────────────────────────
  return (
    <div className="app">
      <Header
        activePage={activePage}
        onNavigate={setActivePage}
        user={user}
        onLogout={handleLogout}
      />

      <main className="main main--dashboard">
        {activePage === 'dashboard' && (
          <PatientDashboard
            patients={patients}
            onPatientCreated={handlePatientCreated}
            user={user}
          />
        )}
        {activePage === 'about' && <AboutPage />}
      </main>
    </div>
  );
}

export default App;