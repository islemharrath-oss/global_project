import React, { useState } from 'react';
import './Header.css';

function Header({ activePage, onNavigate, user, onLogout }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const displayName = user?.username || [user?.first_name, user?.last_name].filter(Boolean).join(' ') || 'user';

  const navItems = user?.role === 'doctor' 
    ? [
        { id: "dashboard", label: "Patients", icon: "👥" },
        { id: "about", label: "About", icon: "ℹ️" },
      ]
    : [
        { id: "about", label: "About", icon: "ℹ️" },
      ];

  return (
    <header className="header">
      <div className="header-inner">
        <div className="logo">
          <span className="logo-icon">⚕</span>
          <div className="logo-text">
            <span className="logo-title">MedVision</span>
            <span className="logo-subtitle">Doctor portal</span>
          </div>
        </div>

        <nav className={`nav ${menuOpen ? "nav--open" : ""}`}>
          {navItems.map((item) => (
            <button
              key={item.id}
              className={`nav-item ${activePage === item.id ? "nav-item--active" : ""}`}
              onClick={() => {
                onNavigate(item.id);
                setMenuOpen(false);
              }}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="header-user">
          <div className="user-chip">
            <span className="user-chip__role">{user?.role || 'user'}</span>
            <span className="user-chip__name">{displayName}</span>
          </div>
          <button className="logout-btn" type="button" onClick={onLogout}>
            Logout
          </button>
        </div>

        <button className="hamburger" onClick={() => setMenuOpen(!menuOpen)}>
          <span></span>
          <span></span>
          <span></span>
        </button>
      </div>
    </header>
  );
}

export default Header;