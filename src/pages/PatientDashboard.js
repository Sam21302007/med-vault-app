import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../api/apiClient';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { format, addDays, isToday, isTomorrow } from 'date-fns';

const PatientDashboard = () => {
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState('book');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [doctors, setDoctors] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [medicalRecords, setMedicalRecords] = useState([]);
  const [loading, setLoading] = useState(false);

  // Booking form state
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedSlot, setSelectedSlot] = useState('');
  const [bookingReason, setBookingReason] = useState('');
  const [priority, setPriority] = useState('normal');
  const [availableSlots, setAvailableSlots] = useState([]);
  const [bookedSlots, setBookedSlots] = useState([]);
  const [filterSpecialty, setFilterSpecialty] = useState('');

  useEffect(() => {
    if (!profile) return;
    fetchDoctors();
    fetchMyAppointments();
    fetchMedicalRecords();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  useEffect(() => {
    if (selectedDoctor && selectedDate) {
      fetchAvailableSlots();
    } else {
      setAvailableSlots([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDoctor, selectedDate]);

  const fetchDoctors = async () => {
    try {
      const data = await apiClient.getDoctors();
      setDoctors(data || []);
    } catch (err) {
      toast.error('Failed to load doctors list');
    }
  };

  const fetchMyAppointments = async () => {
    try {
      const data = await apiClient.getAppointments(profile.id, 'patient');
      setAppointments(data || []);
    } catch (err) {
      toast.error('Failed to load appointments');
    }
  };

  const fetchMedicalRecords = async () => {
    try {
      const data = await apiClient.getMedicalRecords(profile.id);
      setMedicalRecords(data || []);
    } catch (err) {
      toast.error('Failed to load medical records');
    }
  };

  const fetchAvailableSlots = async () => {
    // Generate time slots
    const slots = [];
    for (let h = 9; h <= 17; h++) {
      slots.push(`${h.toString().padStart(2, '0')}:00`);
      if (h < 17) slots.push(`${h.toString().padStart(2, '0')}:30`);
    }

    try {
      const docId = selectedDoctor.id || selectedDoctor._id;
      const data = await apiClient.getAppointments(docId, 'doctor');
      // Filter booked slots on that date
      const taken = (data || [])
        .filter(a => a.appointment_date === selectedDate && a.status !== 'cancelled')
        .map(a => a.time_slot);
      setBookedSlots(taken);
      setAvailableSlots(slots);
    } catch (err) {
      setBookedSlots([]);
      setAvailableSlots(slots);
    }
  };

  const handleBookAppointment = async (e) => {
    e.preventDefault();
    if (!selectedDoctor || !selectedDate || !selectedSlot) {
      toast.error('Please select doctor, date, and time slot');
      return;
    }
    setLoading(true);
    try {
      const patientId = profile.id || profile._id;
      const doctorId = selectedDoctor.id || selectedDoctor._id;

      await apiClient.createAppointment({
        patient_id: patientId,
        doctor_id: doctorId,
        appointment_date: selectedDate,
        time_slot: selectedSlot,
        reason: bookingReason,
        priority,
      });
      toast.success('Appointment booked successfully! 🎉');
      setSelectedDoctor(null);
      setSelectedDate('');
      setSelectedSlot('');
      setBookingReason('');
      setPriority('normal');
      setActiveTab('upcoming');
      fetchMyAppointments();
    } catch (err) {
      toast.error(err.message || 'Failed to book appointment');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelAppointment = async (apptId) => {
    if (!window.confirm('Cancel this appointment?')) return;
    try {
      await apiClient.updateAppointmentStatus(apptId, 'cancelled');
      toast.success('Appointment cancelled');
      fetchMyAppointments();
    } catch (err) {
      toast.error('Failed to cancel appointment');
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const getDateLabel = (dateStr) => {
    const d = new Date(dateStr + 'T00:00:00');
    if (isToday(d)) return 'Today';
    if (isTomorrow(d)) return 'Tomorrow';
    return format(d, 'MMM dd, yyyy');
  };

  const upcomingAppts = appointments.filter(a => ['pending', 'confirmed'].includes(a.status));
  const pastAppts = appointments.filter(a => ['completed', 'cancelled'].includes(a.status));
  const specialties = [...new Set(doctors.map(d => d.specialty).filter(Boolean))];
  const filteredDoctors = filterSpecialty
    ? doctors.filter(d => d.specialty === filterSpecialty)
    : doctors;

  const navItems = [
    { id: 'book', icon: '📅', label: 'Book Appointment' },
    { id: 'upcoming', icon: '🔔', label: 'Upcoming' },
    { id: 'history', icon: '📜', label: 'History' },
    { id: 'records', icon: '🗂️', label: 'Medical Records' },
  ];

  return (
    <div className="dashboard-layout">
      {/* Mobile Backdrop */}
      {mobileNavOpen && (
        <div className="sidebar-backdrop" onClick={() => setMobileNavOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`sidebar ${mobileNavOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-logo">
          <div className="logo-icon">🏥</div>
          <div className="logo-text">
            <h2>MedCare</h2>
            <span>Patient Portal</span>
          </div>
          {mobileNavOpen && (
            <button
              onClick={() => setMobileNavOpen(false)}
              style={{ marginLeft: 'auto', background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'var(--text-muted)' }}
            >
              ✕
            </button>
          )}
        </div>

        <nav className="sidebar-nav">
          <div className="nav-label">Navigation</div>
          {navItems.map(item => (
            <button
              key={item.id}
              className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
              onClick={() => {
                setActiveTab(item.id);
                setMobileNavOpen(false);
              }}
            >
              <span className="nav-icon">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-avatar">
              {profile?.full_name?.[0]?.toUpperCase() || 'P'}
            </div>
            <div className="user-details">
              <h4>{profile?.full_name || 'Patient'}</h4>
              <p>{profile?.role}</p>
            </div>
          </div>
          <button className="btn btn-secondary btn-full btn-sm" onClick={handleSignOut}>
            🚪 Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <div className="dashboard-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              className="mobile-nav-toggle"
              onClick={() => setMobileNavOpen(!mobileNavOpen)}
              aria-label="Toggle navigation menu"
            >
              {mobileNavOpen ? '✕' : '☰'}
            </button>
            <div className="header-title">
              <h1>
                {navItems.find(n => n.id === activeTab)?.icon}{' '}
                {navItems.find(n => n.id === activeTab)?.label}
              </h1>
              <p>Welcome back, {profile?.full_name?.split(' ')[0] || 'Patient'}!</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span className="badge badge-confirmed">✅ Patient</span>
          </div>
        </div>

        <div className="page-content">
          {/* ---- BOOK APPOINTMENT TAB ---- */}
          {activeTab === 'book' && (
            <div>
              <div className="stats-grid" style={{ marginBottom: '24px' }}>
                <div className="stat-card">
                  <div className="stat-icon" style={{ background: 'rgba(99,102,241,0.15)' }}>📅</div>
                  <div className="stat-info">
                    <h3>{upcomingAppts.length}</h3>
                    <p>Upcoming Appointments</p>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon" style={{ background: 'rgba(16,185,129,0.15)' }}>✅</div>
                  <div className="stat-info">
                    <h3>{appointments.filter(a => a.status === 'completed').length}</h3>
                    <p>Completed</p>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon" style={{ background: 'rgba(6,182,212,0.15)' }}>🗂️</div>
                  <div className="stat-info">
                    <h3>{medicalRecords.length}</h3>
                    <p>Medical Records</p>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon" style={{ background: 'rgba(16,185,129,0.15)' }}>👨‍⚕️</div>
                  <div className="stat-info">
                    <h3>{doctors.length}</h3>
                    <p>Available Doctors</p>
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                {/* Doctor Selection */}
                <div className="card" style={{ gridColumn: '1 / -1' }}>
                  <div className="section-header">
                    <span className="section-title">👨‍⚕️ Select a Doctor</span>
                    <select
                      className="form-select"
                      style={{ width: 'auto' }}
                      value={filterSpecialty}
                      onChange={(e) => setFilterSpecialty(e.target.value)}
                    >
                      <option value="">All Specialties</option>
                      {specialties.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
                    {filteredDoctors.length === 0 ? (
                      <div className="empty-state" style={{ gridColumn: '1/-1' }}>
                        <div className="empty-icon">👨‍⚕️</div>
                        <h3>No doctors registered yet</h3>
                        <p>Doctors will appear here once they register</p>
                      </div>
                    ) : filteredDoctors.map(doc => {
                      const docId = doc.id || doc._id;
                      const selectedDocId = selectedDoctor?.id || selectedDoctor?._id;
                      const isSelected = selectedDocId === docId;
                      return (
                        <div
                          key={docId}
                          onClick={() => setSelectedDoctor(isSelected ? null : { ...doc, id: docId })}
                          style={{
                            padding: '18px 14px',
                            borderRadius: 'var(--radius-lg)',
                            border: `2px solid ${isSelected ? 'var(--primary)' : 'var(--border)'}`,
                            background: isSelected ? 'rgba(79, 70, 229, 0.08)' : 'var(--bg-card)',
                            boxShadow: isSelected ? 'var(--shadow-glow)' : 'var(--shadow-sm)',
                            cursor: 'pointer',
                            transition: 'var(--transition)',
                            textAlign: 'center',
                            position: 'relative',
                          }}
                        >
                          {isSelected && (
                            <span style={{
                              position: 'absolute', top: '10px', right: '10px',
                              background: 'var(--primary)', color: 'white',
                              borderRadius: '50%', width: '22px', height: '22px',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: '12px', fontWeight: 'bold'
                            }}>✓</span>
                          )}
                          <div style={{
                            width: '50px', height: '50px', borderRadius: '50%',
                            background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                            color: 'white',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '22px', margin: '0 auto 10px',
                            boxShadow: '0 4px 12px rgba(79, 70, 229, 0.25)'
                          }}>👨‍⚕️</div>
                          <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)' }}>
                            Dr. {doc.full_name}
                          </div>
                          <div style={{
                            display: 'inline-block',
                            marginTop: '6px',
                            padding: '3px 10px',
                            borderRadius: '12px',
                            fontSize: '12px',
                            fontWeight: '600',
                            background: 'rgba(79, 70, 229, 0.1)',
                            color: 'var(--primary)',
                          }}>
                            {doc.specialty || 'General Physician'}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Booking Form */}
                {selectedDoctor && (
                  <div className="card" style={{ gridColumn: '1 / -1' }}>
                    <h3 style={{ marginBottom: '20px', fontFamily: 'var(--font-heading)' }}>
                      📅 Book with Dr. {selectedDoctor.full_name}
                    </h3>
                    <form onSubmit={handleBookAppointment}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                        <div className="form-group">
                          <label className="form-label">Appointment Date *</label>
                          <input
                            className="form-input"
                            type="date"
                            min={format(new Date(), 'yyyy-MM-dd')}
                            max={format(addDays(new Date(), 30), 'yyyy-MM-dd')}
                            value={selectedDate}
                            onChange={(e) => { setSelectedDate(e.target.value); setSelectedSlot(''); }}
                          />
                        </div>

                        <div className="form-group">
                          <label className="form-label">Priority Level</label>
                          <select
                            className="form-select"
                            value={priority}
                            onChange={(e) => setPriority(e.target.value)}
                          >
                            <option value="normal">🟢 Normal</option>
                            <option value="urgent">🟠 Urgent</option>
                            <option value="emergency">🔴 Emergency</option>
                          </select>
                        </div>
                      </div>

                      {/* Time Slots */}
                      {selectedDate && (
                        <div className="form-group">
                          <label className="form-label">
                            Available Time Slots {selectedDate && `— ${getDateLabel(selectedDate)}`}
                          </label>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                            {availableSlots.map(slot => {
                              const isTaken = bookedSlots.includes(slot);
                              const isSelected = selectedSlot === slot;
                              return (
                                <button
                                  key={slot}
                                  type="button"
                                  disabled={isTaken}
                                  onClick={() => setSelectedSlot(slot)}
                                  style={{
                                    padding: '8px 14px',
                                    borderRadius: 'var(--radius-sm)',
                                    border: `1.5px solid ${isSelected ? 'var(--primary)' : isTaken ? 'rgba(239,68,68,0.3)' : 'var(--border)'}`,
                                    background: isSelected ? 'var(--primary)' : isTaken ? 'rgba(239,68,68,0.1)' : 'var(--bg-input)',
                                    color: isTaken ? 'var(--danger)' : isSelected ? 'white' : 'var(--text-secondary)',
                                    fontSize: '13px',
                                    fontWeight: '600',
                                    cursor: isTaken ? 'not-allowed' : 'pointer',
                                    transition: 'var(--transition)',
                                    textDecoration: isTaken ? 'line-through' : 'none',
                                  }}
                                >
                                  {slot}
                                </button>
                              );
                            })}
                          </div>
                          {availableSlots.length > 0 && (
                            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px' }}>
                              🔴 Booked &nbsp; 🟢 Available
                            </div>
                          )}
                        </div>
                      )}

                      <div className="form-group">
                        <label className="form-label">Reason for Visit</label>
                        <textarea
                          className="form-textarea"
                          placeholder="Describe your symptoms or reason for the appointment..."
                          value={bookingReason}
                          onChange={(e) => setBookingReason(e.target.value)}
                          style={{ minHeight: '80px' }}
                        />
                      </div>

                      {priority !== 'normal' && (
                        <div style={{
                          padding: '12px 16px',
                          borderRadius: 'var(--radius-md)',
                          background: priority === 'emergency' ? 'rgba(255,59,48,0.1)' : 'rgba(255,149,0,0.1)',
                          border: `1px solid ${priority === 'emergency' ? 'rgba(255,59,48,0.3)' : 'rgba(255,149,0,0.3)'}`,
                          marginBottom: '16px',
                          fontSize: '13px',
                          color: priority === 'emergency' ? 'var(--emergency)' : 'var(--urgent)',
                        }}>
                          {priority === 'emergency' ? '🚨' : '⚠️'}{' '}
                          {priority === 'emergency'
                            ? 'Emergency appointments are given top priority and moved to the front of the queue.'
                            : 'Urgent appointments are prioritized above normal cases.'}
                        </div>
                      )}

                      <div style={{ display: 'flex', gap: '12px' }}>
                        <button type="submit" className="btn btn-primary" disabled={loading}>
                          {loading ? '⏳ Booking...' : '✅ Confirm Booking'}
                        </button>
                        <button type="button" className="btn btn-secondary" onClick={() => setSelectedDoctor(null)}>
                          Cancel
                        </button>
                      </div>
                    </form>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ---- UPCOMING APPOINTMENTS ---- */}
          {activeTab === 'upcoming' && (
            <div>
              {upcomingAppts.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">📅</div>
                  <h3>No upcoming appointments</h3>
                  <p>Book an appointment with a doctor to get started</p>
                  <button className="btn btn-primary" style={{ marginTop: '16px' }} onClick={() => setActiveTab('book')}>
                    📅 Book Appointment
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {upcomingAppts.map(appt => (
                    <div key={appt.id} className="card" style={{ padding: '20px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                          <div style={{
                            width: '50px', height: '50px', borderRadius: '50%',
                            background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px',
                          }}>👨‍⚕️</div>
                          <div>
                            <div style={{ fontWeight: '700', fontSize: '16px', marginBottom: '4px' }}>
                              Dr. {appt.doctor?.full_name}
                            </div>
                            <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                              {appt.doctor?.specialty}
                            </div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          <span className={`badge badge-${appt.priority}`}>
                            {appt.priority === 'emergency' ? '🚨' : appt.priority === 'urgent' ? '⚠️' : '✅'} {appt.priority}
                          </span>
                          <span className={`badge badge-${appt.status}`}>{appt.status}</span>
                        </div>
                      </div>

                      <div style={{ marginTop: '16px', display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '12px' }}>
                        <div style={{ background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)', padding: '10px' }}>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>DATE</div>
                          <div style={{ fontSize: '14px', fontWeight: '600' }}>{getDateLabel(appt.appointment_date)}</div>
                        </div>
                        <div style={{ background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)', padding: '10px' }}>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>TIME</div>
                          <div style={{ fontSize: '14px', fontWeight: '600' }}>{appt.time_slot}</div>
                        </div>
                        <div style={{ background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)', padding: '10px' }}>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>REASON</div>
                          <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{appt.reason || 'General consultation'}</div>
                        </div>
                      </div>

                      {appt.status === 'pending' && (
                        <div style={{ marginTop: '12px' }}>
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => handleCancelAppointment(appt.id)}
                          >
                            ❌ Cancel Appointment
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ---- HISTORY ---- */}
          {activeTab === 'history' && (
            <div>
              {pastAppts.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">📜</div>
                  <h3>No appointment history</h3>
                  <p>Your completed and cancelled appointments will appear here</p>
                </div>
              ) : (
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Doctor</th>
                        <th>Date</th>
                        <th>Time</th>
                        <th>Priority</th>
                        <th>Status</th>
                        <th>Reason</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pastAppts.map(appt => (
                        <tr key={appt.id}>
                          <td>
                            <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>
                              Dr. {appt.doctor?.full_name}
                            </div>
                            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{appt.doctor?.specialty}</div>
                          </td>
                          <td>{format(new Date(appt.appointment_date + 'T00:00:00'), 'MMM dd, yyyy')}</td>
                          <td>{appt.time_slot}</td>
                          <td><span className={`badge badge-${appt.priority}`}>{appt.priority}</span></td>
                          <td><span className={`badge badge-${appt.status}`}>{appt.status}</span></td>
                          <td style={{ maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {appt.reason || '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ---- MEDICAL RECORDS ---- */}
          {activeTab === 'records' && (
            <div>
              {medicalRecords.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">🗂️</div>
                  <h3>No medical records yet</h3>
                  <p>Medical records will appear here after a doctor completes your appointment</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {medicalRecords.map(rec => (
                    <div key={rec.id} className="card" style={{ padding: '24px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <div>
                          <div style={{ fontWeight: '700', fontSize: '16px' }}>Dr. {rec.doctor?.full_name}</div>
                          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                            {rec.doctor?.specialty} · {format(new Date(rec.created_at), 'MMM dd, yyyy')}
                          </div>
                        </div>
                        <span className="badge badge-completed">Medical Record</span>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <div>
                          <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--primary-light)', textTransform: 'uppercase', marginBottom: '6px' }}>
                            Diagnosis
                          </div>
                          <div style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                            {rec.diagnosis || 'Not specified'}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--primary-light)', textTransform: 'uppercase', marginBottom: '6px' }}>
                            Prescription
                          </div>
                          <div style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                            {rec.prescription || 'No prescription'}
                          </div>
                        </div>
                      </div>

                      {rec.notes && (
                        <div style={{ marginTop: '12px', padding: '12px', background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)' }}>
                          <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>
                            Doctor's Notes
                          </div>
                          <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{rec.notes}</div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default PatientDashboard;
