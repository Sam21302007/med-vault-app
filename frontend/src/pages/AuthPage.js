import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import '../styles/auth.css';

const AuthPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { signIn, signUp, profile, user } = useAuth();

  const [mode, setMode] = useState(searchParams.get('mode') === 'register' ? 'register' : 'login');
  const [role, setRole] = useState(searchParams.get('role') || 'patient');
  const [loading, setLoading] = useState(false);

  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [registerForm, setRegisterForm] = useState({
    full_name: '',
    email: '',
    password: '',
    confirm_password: '',
    phone: '',
    date_of_birth: '',
    gender: '',
    specialty: '',
  });

  const redirectByRole = useCallback((r) => {
    if (r === 'admin') navigate('/admin');
    else if (r === 'doctor') navigate('/doctor');
    else navigate('/patient');
  }, [navigate]);

  useEffect(() => {
    if (user && profile) {
      redirectByRole(profile.role);
    }
  }, [user, profile, redirectByRole]);

  const demoAccounts = [
    { label: 'Patient Demo', email: 'patient@demo.com', password: 'demo1234', role: 'patient' },
    { label: 'Doctor Demo', email: 'doctor@demo.com', password: 'demo1234', role: 'doctor' },
    { label: 'Admin Demo', email: 'admin@demo.com', password: 'demo1234', role: 'admin' },
  ];

  const handleDemoLogin = async (demo) => {
    setLoading(true);
    try {
      await signIn(demo.email, demo.password);
      toast.success(`Logged in as ${demo.label}!`);
    } catch (err) {
      toast.error('Demo account not set up yet. Please register first.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!loginForm.email || !loginForm.password) {
      toast.error('Please fill all fields');
      return;
    }
    setLoading(true);
    try {
      await signIn(loginForm.email, loginForm.password);
      toast.success('Welcome back! 🎉');
    } catch (err) {
      toast.error(err.message || 'Login failed. Check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!registerForm.full_name || !registerForm.email || !registerForm.password) {
      toast.error('Please fill all required fields');
      return;
    }
    if (registerForm.password !== registerForm.confirm_password) {
      toast.error('Passwords do not match!');
      return;
    }
    if (registerForm.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    if (role === 'doctor' && !registerForm.specialty) {
      toast.error('Please select your specialty');
      return;
    }

    setLoading(true);
    try {
      const profileData = {
        full_name: registerForm.full_name,
        role,
        phone: registerForm.phone,
        date_of_birth: registerForm.date_of_birth || null,
        gender: registerForm.gender,
        specialty: role === 'doctor' ? registerForm.specialty : null,
      };
      await signUp(registerForm.email, registerForm.password, profileData);
      toast.success('Account created! Please check your email or login directly.');
      setMode('login');
    } catch (err) {
      toast.error(err.message || 'Registration failed. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const specialties = [
    'General Physician', 'Cardiologist', 'Neurologist', 'Orthopedic',
    'Pediatrician', 'Dermatologist', 'Ophthalmologist', 'ENT Specialist',
    'Gynecologist', 'Psychiatrist', 'Radiologist', 'Oncologist',
  ];

  return (
    <div className="auth-page">
      <div className="auth-bg-orb auth-bg-orb-1"></div>
      <div className="auth-bg-orb auth-bg-orb-2"></div>

      <button className="back-to-home" onClick={() => navigate('/')}>
        ← Back to Home
      </button>

      <div className="auth-card">
        <div className="auth-logo">
          <div className="auth-logo-icon">🏥</div>
          <h1>MedCare</h1>
          <p>Hospital Appointment System</p>
        </div>

        {/* Mode Tabs */}
        <div className="auth-tabs">
          <button
            className={`auth-tab ${mode === 'login' ? 'active' : ''}`}
            onClick={() => setMode('login')}
          >
            Sign In
          </button>
          <button
            className={`auth-tab ${mode === 'register' ? 'active' : ''}`}
            onClick={() => setMode('register')}
          >
            Register
          </button>
        </div>

        {/* Demo Accounts (Login mode only) */}
        {mode === 'login' && (
          <div className="demo-accounts">
            <h4>🎯 Quick Demo Login</h4>
            {demoAccounts.map((demo) => (
              <button
                key={demo.label}
                className="demo-account-btn"
                onClick={() => handleDemoLogin(demo)}
                disabled={loading}
              >
                <span>
                  {demo.role === 'patient' ? '🧑' : demo.role === 'doctor' ? '👨‍⚕️' : '🛡️'}{' '}
                  {demo.label}
                </span>
                <span>{demo.email}</span>
              </button>
            ))}
          </div>
        )}

        {/* Role Selector (Register mode) */}
        {mode === 'register' && (
          <div className="form-group">
            <label className="form-label">Register As</label>
            <div className="role-selector">
              <button
                type="button"
                className={`role-btn ${role === 'patient' ? 'selected' : ''}`}
                onClick={() => setRole('patient')}
              >
                <span className="role-icon">🧑</span>
                <span className="role-name">Patient</span>
              </button>
              <button
                type="button"
                className={`role-btn ${role === 'doctor' ? 'selected' : ''}`}
                onClick={() => setRole('doctor')}
              >
                <span className="role-icon">👨‍⚕️</span>
                <span className="role-name">Doctor</span>
              </button>
              <button
                type="button"
                className={`role-btn ${role === 'admin' ? 'selected' : ''}`}
                onClick={() => setRole('admin')}
              >
                <span className="role-icon">🛡️</span>
                <span className="role-name">Admin</span>
              </button>
            </div>
          </div>
        )}

        {/* Login Form */}
        {mode === 'login' && (
          <form onSubmit={handleLogin}>
            <div className="auth-divider">or sign in with email</div>

            <div className="form-group">
              <label className="form-label">Email Address</label>
              <div className="input-with-icon">
                <span className="input-icon">✉️</span>
                <input
                  className="form-input"
                  type="email"
                  placeholder="your@email.com"
                  value={loginForm.email}
                  onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <div className="input-with-icon">
                <span className="input-icon">🔒</span>
                <input
                  className="form-input"
                  type="password"
                  placeholder="Enter password"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading}>
              {loading ? '⏳ Signing In...' : '🔐 Sign In'}
            </button>
          </form>
        )}

        {/* Register Form */}
        {mode === 'register' && (
          <form onSubmit={handleRegister}>
            <div className="form-group">
              <label className="form-label">Full Name *</label>
              <input
                className="form-input"
                type="text"
                placeholder="Dr. / Mr. / Ms. Your Name"
                value={registerForm.full_name}
                onChange={(e) => setRegisterForm({ ...registerForm, full_name: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Email Address *</label>
              <input
                className="form-input"
                type="email"
                placeholder="your@email.com"
                value={registerForm.email}
                onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">Password *</label>
                <input
                  className="form-input"
                  type="password"
                  placeholder="Min 6 chars"
                  value={registerForm.password}
                  onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Confirm Password *</label>
                <input
                  className="form-input"
                  type="password"
                  placeholder="Repeat password"
                  value={registerForm.confirm_password}
                  onChange={(e) => setRegisterForm({ ...registerForm, confirm_password: e.target.value })}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">Phone</label>
                <input
                  className="form-input"
                  type="tel"
                  placeholder="+91 9876543210"
                  value={registerForm.phone}
                  onChange={(e) => setRegisterForm({ ...registerForm, phone: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Gender</label>
                <select
                  className="form-select"
                  value={registerForm.gender}
                  onChange={(e) => setRegisterForm({ ...registerForm, gender: e.target.value })}
                >
                  <option value="">Select</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            {role === 'doctor' && (
              <div className="form-group">
                <label className="form-label">Medical Specialty *</label>
                <select
                  className="form-select"
                  value={registerForm.specialty}
                  onChange={(e) => setRegisterForm({ ...registerForm, specialty: e.target.value })}
                >
                  <option value="">Select Specialty</option>
                  {specialties.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            )}

            <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading}>
              {loading ? '⏳ Creating Account...' : '🚀 Create Account'}
            </button>
          </form>
        )}

        <div className="auth-footer">
          {mode === 'login' ? (
            <>Don't have an account?{' '}
              <button className="auth-link" onClick={() => setMode('register')}>Register</button>
            </>
          ) : (
            <>Already have an account?{' '}
              <button className="auth-link" onClick={() => setMode('login')}>Sign In</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
