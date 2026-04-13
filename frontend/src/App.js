import React, { useEffect, useState } from 'react';
import './App.css';
import Header from './components/Header';
import AuthPage from './components/AuthPage';
import PatientDashboard from './components/PatientDashboard';
import {
  clearAuthTokens,
  getCurrentUser,
  getPatients,
  getStoredUserTokens,
  loginDoctor,
  registerDoctor,
} from './api';

function App() {
  const [activePage, setActivePage] = useState('dashboard');
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState('');
  const [user, setUser] = useState(null);
  const [patients, setPatients] = useState([]);

  const loadPatients = async () => {
    if (!user || user.role !== 'doctor') return;
    try {
      const data = await getPatients();
      setPatients(data.results || []);
    } catch (err) {
      console.error('Patient fetch error:', err);
    }
  };

  useEffect(() => {
    const bootstrap = async () => {
      const tokens = getStoredUserTokens();
      if (!tokens.access) {
        setAuthLoading(false);
        return;
      }

      try {
        const me = await getCurrentUser();
        setUser(me);
        if (me.role === 'doctor') {
          const data = await getPatients();
          setPatients(data.results || []);
          setActivePage('dashboard');
        }
      } catch (err) {
        console.error('Session restore failed:', err);
        clearAuthTokens();
      } finally {
        setAuthLoading(false);
      }
    };

    bootstrap();
  }, []);

  const handleLogin = async ({ username, password }) => {
    setAuthLoading(true);
    setAuthError('');
    setUser(null);
    setPatients([]);
    try {
      await loginDoctor(username, password);
      const me = await getCurrentUser();
      setUser(me);
      if (me.role === 'doctor') {
        const data = await getPatients();
        setPatients(data.results || []);
      }
      setActivePage('dashboard');
    } catch (err) {
      setAuthError(err.message || 'Login failed');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleRegister = async (payload) => {
    setAuthLoading(true);
    setAuthError('');
    setUser(null);
    setPatients([]);
    try {
      const data = await registerDoctor(payload);
      setUser(data.user);
      const patientData = await getPatients();
      setPatients(patientData.results || []);
      setActivePage('dashboard');
    } catch (err) {
      setAuthError(err.message || 'Registration failed');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    clearAuthTokens();
    setUser(null);
    setPatients([]);
    setAuthError('');
    setActivePage('dashboard');
  };

  const handlePatientCreated = async () => {
    await loadPatients();
  };

  if (authLoading) {
    return (
      <div className="auth-shell">
        <div className="auth-card">
          <div className="auth-hero">
            <h1>Loading MedVision...</h1>
            <p>Restoring your secure doctor session.</p>
          </div>
        </div>
      </div>
    );
  }

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

  return (
    <div className="app">
      <Header
        activePage={activePage}
        onNavigate={setActivePage}
        user={user}
        onLogout={handleLogout}
      />

      <main className={`main ${activePage === 'dashboard' ? 'main--dashboard' : ''}`}>
        {activePage === 'dashboard' && user?.role === 'doctor' && (
          <PatientDashboard
            patients={patients}
            onPatientCreated={handlePatientCreated}
            user={user}
          />
        )}

        {activePage === 'about' && (
          <div className="page-about">
            <div className="about-card">
              <h2 className="about-title">
                <span className="title-accent">⚕</span> MedVision Doctor Portal
              </h2>
              <p className="about-desc">
                Patient-first radiology workspace: choose or create a patient first, then create
                and review reports for that patient.
              </p>
              <div className="about-stack">
                {[
                  'Doctor accounts',
                  'Patient accounts',
                  'JWT authentication',
                  'Validated reports',
                  'PostgreSQL database',
                ].map((item) => (
                  <span key={item} className="stack-badge">{item}</span>
                ))}
              </div>
              <p className="about-disclaimer">
                ⚠️ This system is an aid-to-diagnosis tool only and does not replace a licensed physician.
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
