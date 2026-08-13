import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/landing.css';

const LandingPage = () => {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const features = [
    {
      icon: '👤',
      title: 'Patient & Doctor Registration',
      desc: 'Seamless role-based registration and secure login for patients, doctors, and administrators.',
      color: 'rgba(99,102,241,0.15)',
    },
    {
      icon: '📅',
      title: 'Smart Appointment Scheduling',
      desc: 'Optimized time-slot allocation with conflict detection and real-time availability management.',
      color: 'rgba(6,182,212,0.15)',
    },
    {
      icon: '🚨',
      title: 'Emergency & Priority Handling',
      desc: 'Emergency and urgent cases are automatically prioritized and moved to the top of the queue.',
      color: 'rgba(239,68,68,0.15)',
    },
    {
      icon: '📋',
      title: 'Medical Records',
      desc: 'Complete appointment history and secure medical records accessible to patients and their doctors.',
      color: 'rgba(16,185,129,0.15)',
    },
    {
      icon: '📊',
      title: 'Admin Analytics Dashboard',
      desc: 'Comprehensive reports with charts, statistics, and doctor performance metrics for administrators.',
      color: 'rgba(245,158,11,0.15)',
    },
    {
      icon: '📱',
      title: 'Responsive Web Interface',
      desc: 'Fully responsive design that works flawlessly on desktop, tablet, and mobile devices.',
      color: 'rgba(168,85,247,0.15)',
    },
  ];

  const steps = [
    { number: '1', title: 'Create Account', desc: 'Register as a patient or doctor. Admins are pre-configured.' },
    { number: '2', title: 'Book Appointment', desc: 'Choose your doctor, pick a date and available time slot.' },
    { number: '3', title: 'Get Priority Care', desc: 'Emergency cases skip the queue and get instant attention.' },
    { number: '4', title: 'Track Records', desc: 'View your complete appointment history and medical records anytime.' },
  ];

  return (
    <div className="landing-page">
      {/* Navbar */}
      <nav className={`landing-nav ${scrolled ? 'scrolled' : ''}`}>
        <div className="container">
          <div className="nav-inner">
            <div className="nav-brand">
              <div className="nav-brand-icon">🏥</div>
              <span className="nav-brand-name">MedCare</span>
            </div>
            <div className="nav-links">
              <button className="btn btn-secondary btn-sm" onClick={() => navigate('/auth')}>Login</button>
              <button className="btn btn-primary btn-sm" onClick={() => navigate('/auth?mode=register')}>Register</button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-bg">
          <div className="hero-grid"></div>
          <div className="hero-orb hero-orb-1"></div>
          <div className="hero-orb hero-orb-2"></div>
          <div className="hero-orb hero-orb-3"></div>
        </div>

        <div className="container">
          <div className="hero-content">
            <div className="hero-text">
              <div className="hero-badge">
                <span>🏥</span>
                <span>Hospital Appointment System</span>
              </div>

              <h1 className="hero-title">
                Modern Healthcare{' '}
                <span className="hero-title-gradient">Scheduling</span>{' '}
                Made Simple
              </h1>

              <p className="hero-subtitle">
                A complete hospital management platform — book appointments, manage
                priority queues, access medical records, and track analytics all
                in one place.
              </p>

              <div className="hero-actions">
                <button
                  className="btn btn-primary btn-lg"
                  onClick={() => navigate('/auth?mode=register')}
                >
                  🚀 Get Started
                </button>
                <button
                  className="btn btn-secondary btn-lg"
                  onClick={() => navigate('/auth')}
                >
                  Sign In
                </button>
              </div>
            </div>

            <div className="hero-visual">
              <div className="hero-card-stack">
                <div className="floating-badge floating-badge-2">
                  🚨 Emergency Priority
                </div>

                <div className="hero-main-card">
                  <div className="hero-card-header">
                    <div className="hero-card-avatar">👨‍⚕️</div>
                    <div className="hero-card-info">
                      <h4>Dr. Priya Sharma</h4>
                      <p>Cardiologist — Today's Queue</p>
                    </div>
                  </div>

                  <div className="hero-appointment-item">
                    <div className="appt-dot emergency"></div>
                    <div className="appt-info">
                      <h5>Ravi Kumar</h5>
                      <p>Chest Pain — Emergency</p>
                    </div>
                    <span className="appt-time">09:00 AM</span>
                  </div>

                  <div className="hero-appointment-item">
                    <div className="appt-dot urgent"></div>
                    <div className="appt-info">
                      <h5>Meena Patel</h5>
                      <p>High BP — Urgent</p>
                    </div>
                    <span className="appt-time">09:30 AM</span>
                  </div>

                  <div className="hero-appointment-item">
                    <div className="appt-dot normal"></div>
                    <div className="appt-info">
                      <h5>Arjun Singh</h5>
                      <p>Routine Checkup</p>
                    </div>
                    <span className="appt-time">10:00 AM</span>
                  </div>

                  <div className="hero-appointment-item">
                    <div className="appt-dot normal"></div>
                    <div className="appt-info">
                      <h5>Sunita Rao</h5>
                      <p>Follow-up Visit</p>
                    </div>
                    <span className="appt-time">10:30 AM</span>
                  </div>
                </div>

                <div className="floating-badge floating-badge-1">
                  ✅ 4 Appointments Today
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section" id="features">
        <div className="container">
          <div className="section-badge">
            <span className="badge badge-normal">✨ Features</span>
          </div>
          <h2 className="section-heading">Everything You Need</h2>
          <p className="section-desc">
            A comprehensive hospital appointment system designed for efficiency,
            clarity, and excellent patient care.
          </p>

          <div className="features-grid">
            {features.map((feat, i) => (
              <div className="feature-card" key={i}>
                <div className="feature-icon" style={{ background: feat.color }}>
                  {feat.icon}
                </div>
                <h3 className="feature-title">{feat.title}</h3>
                <p className="feature-desc">{feat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="how-section">
        <div className="container">
          <div className="section-badge">
            <span className="badge badge-confirmed">🔄 How It Works</span>
          </div>
          <h2 className="section-heading">Simple, Fast & Reliable</h2>
          <p className="section-desc">
            Getting started takes minutes. Book, manage, and track your healthcare
            in four easy steps.
          </p>

          <div className="steps-grid">
            {steps.map((step, i) => (
              <div className="step-card" key={i}>
                <div className="step-number">{step.number}</div>
                <h3 className="step-title">{step.title}</h3>
                <p className="step-desc">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="container">
          <div className="cta-card">
            <h2 className="cta-title">Ready to Transform Healthcare Scheduling?</h2>
            <p className="cta-desc">
              Join MedCare today. Patients, doctors, and administrators all in one platform.
            </p>
            <div className="cta-buttons">
              <button
                className="btn btn-primary btn-lg"
                onClick={() => navigate('/auth?mode=register')}
              >
                🏥 Register as Patient
              </button>
              <button
                className="btn btn-secondary btn-lg"
                onClick={() => navigate('/auth?role=doctor&mode=register')}
              >
                👨‍⚕️ Register as Doctor
              </button>
              <button
                className="btn btn-secondary btn-lg"
                onClick={() => navigate('/auth')}
              >
                🔐 Admin Login
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="container">
          <div className="footer-brand">🏥 MedCare</div>
          <p className="footer-tagline">Hospital Appointment Management System</p>
          <p className="footer-copy">
            Built for Code Carnival — Francis Xavier Engineering College &nbsp;|&nbsp; Department of CSE
          </p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
