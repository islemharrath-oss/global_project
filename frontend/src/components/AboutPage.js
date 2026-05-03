import React from "react";
import "./AboutPage.css";

export default function AboutPage() {
  return (
    <div className="about-page">

      {/* Hero */}
      <section className="about-hero">
        <div className="about-hero__badge">About Us</div>
        <h1 className="about-hero__title">
          Welcome to <span className="about-hero__accent">MedVision</span>
        </h1>
        <p className="about-hero__desc">
          A smart radiology platform built to support physicians in their daily clinical work,
          combining the power of artificial intelligence with the precision of medical expertise.
        </p>
      </section>

      {/* Mission */}
      <section className="about-section">
        <div className="section-label">Our Mission</div>
        <h2 className="section-title">Empowering doctors with intelligent tools</h2>
        <p className="section-text">
          MedVision was created with a single purpose: to make radiology analysis faster,
          more accurate, and more accessible. We believe that technology should serve
          clinicians — not replace them. Our platform acts as a powerful second opinion,
          helping physicians focus on what matters most: their patients.
        </p>
      </section>

      {/* What we do */}
      <section className="about-section">
        <div className="section-label">What We Do</div>
        <h2 className="section-title">From image to insight, in minutes</h2>
        <p className="section-text">
          MedVision analyzes chest X-ray images and automatically generates structured
          radiology reports alongside a patient-friendly explanation. Physicians can upload
          an image, review the findings, and share clear results with their patients —
          all within a single, secure workspace.
        </p>

        <div className="about-cards">
          <div className="about-card">
            <span className="about-card__icon">🫁</span>
            <h3>Chest X-Ray Analysis</h3>
            <p>Automated detection of pulmonary findings from radiographic images with visual highlighting of areas of interest.</p>
          </div>
          <div className="about-card">
            <span className="about-card__icon">📋</span>
            <h3>Structured Reports</h3>
            <p>Instant generation of detailed radiology reports, ready to be reviewed, downloaded, or shared with colleagues.</p>
          </div>
          <div className="about-card">
            <span className="about-card__icon">💬</span>
            <h3>Patient Communication</h3>
            <p>Each report includes a clear, accessible explanation designed to help patients understand their diagnosis.</p>
          </div>
          <div className="about-card">
            <span className="about-card__icon">🔒</span>
            <h3>Secure & Private</h3>
            <p>Patient data is handled with strict confidentiality. Every account is protected and access is fully controlled by the physician.</p>
          </div>
        </div>
      </section>

      {/* Who it's for */}
      <section className="about-section">
        <div className="section-label">Who It's For</div>
        <h2 className="section-title">Built for medical professionals</h2>
        <p className="section-text">
          MedVision is designed for radiologists, pulmonologists, general practitioners,
          and any physician who works with chest imaging. Whether you are managing a large
          patient load or seeking a reliable second analysis, MedVision adapts to your workflow.
        </p>
      </section>

      {/* Disclaimer */}
      <section className="about-disclaimer">
        <span className="disclaimer-icon">⚕</span>
        <p>
          MedVision is a <strong>clinical decision support tool</strong>. All diagnostic
          decisions remain the sole responsibility of the treating physician. Results must
          always be reviewed and validated by a qualified medical professional.
        </p>
      </section>

    </div>
  );
}