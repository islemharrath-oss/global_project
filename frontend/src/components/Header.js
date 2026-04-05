import React, { useState } from "react";
import "./Header.css";

function Header({ activePage, onNavigate }) {
  const [menuOpen, setMenuOpen] = useState(false);

  const navItems = [
    { id: "upload", label: "Analyse", icon: "🫁" },
    { id: "history", label: "Historique", icon: "📋" },
    { id: "about", label: "À propos", icon: "ℹ️" },
  ];

  return (
    <header className="header">
      <div className="header-inner">
        <div className="logo">
          <span className="logo-icon">⚕</span>
          <div className="logo-text">
            <span className="logo-title">MedVision</span>
            <span className="logo-subtitle">Chest X-Ray AI Report</span>
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

        <button
          className="hamburger"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          <span></span>
          <span></span>
          <span></span>
        </button>
      </div>
    </header>
  );
}

export default Header;