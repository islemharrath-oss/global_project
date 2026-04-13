import React, { useState } from 'react';
import './AuthPage.css';

const doctorInitial = {
  username: '',
  email: '',
  password: '',
  first_name: '',
  last_name: '',
  specialty: '',
  license_number: '',
  hospital: '',
  phone: '',
};

function AuthPage({ onLogin, onRegister, isLoading, error }) {
  const [mode, setMode] = useState('login');
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [registerForm, setRegisterForm] = useState(doctorInitial);

  const handleLoginSubmit = (event) => {
    event.preventDefault();
    onLogin({
      username: loginForm.username.trim(),
      password: loginForm.password,
    });
  };

  const handleRegisterSubmit = (event) => {
    event.preventDefault();
    onRegister({
      ...registerForm,
      username: registerForm.username.trim(),
      email: registerForm.email.trim(),
      first_name: registerForm.first_name.trim(),
      last_name: registerForm.last_name.trim(),
      specialty: registerForm.specialty.trim(),
      license_number: registerForm.license_number.trim(),
      hospital: registerForm.hospital.trim(),
      phone: registerForm.phone.trim(),
    });
  };

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="auth-hero">
          <div className="auth-badge">MedVision • Doctor Portal</div>
          <h1>Secure radiology workspace for doctors</h1>
          <p>
            Sign in to analyze X-rays, manage patient records, and generate validated reports.
          </p>
          <div className="auth-points">
            <span>Doctor accounts</span>
            <span>Patient profiles</span>
            <span>JWT protected API</span>
          </div>
        </div>

        <div className="auth-panel">
          <div className="auth-tabs">
            <button className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')} type="button">
              Login
            </button>
            <button className={mode === 'register' ? 'active' : ''} onClick={() => setMode('register')} type="button">
              Doctor Sign Up
            </button>
          </div>

          {error ? <div className="auth-error">{error}</div> : null}

          {mode === 'login' ? (
            <form onSubmit={handleLoginSubmit} className="auth-form">
              <label>
                Username
                <input
                  value={loginForm.username}
                  onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
                  required
                />
              </label>
              <label>
                Password
                <input
                  type="password"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                  required
                />
              </label>
              <button type="submit" className="auth-submit" disabled={isLoading}>
                {isLoading ? 'Signing in...' : 'Login'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegisterSubmit} className="auth-form auth-form--grid">
              {[
                ['username', 'Username'],
                ['email', 'Email'],
                ['first_name', 'First name'],
                ['last_name', 'Last name'],
                ['specialty', 'Specialty'],
                ['license_number', 'License number'],
                ['hospital', 'Hospital'],
                ['phone', 'Phone'],
              ].map(([field, label]) => (
                <label key={field}>
                  {label}
                  <input
                    type={field === 'email' ? 'email' : 'text'}
                    value={registerForm[field]}
                    onChange={(e) => setRegisterForm({ ...registerForm, [field]: e.target.value })}
                    required={field !== 'hospital' && field !== 'phone'}
                  />
                </label>
              ))}
              <label className="auth-full-width">
                Password
                <input
                  type="password"
                  value={registerForm.password}
                  onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
                  required
                />
              </label>
              <button type="submit" className="auth-submit auth-full-width" disabled={isLoading}>
                {isLoading ? 'Creating account...' : 'Create doctor account'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default AuthPage;
