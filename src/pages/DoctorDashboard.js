import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../api/apiClient';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const DoctorDashboard = () => {
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState('queue');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [appointments, setAppointments] = useState([]);
  const [allAppointments, setAllAppointments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedAppt, setSelectedAppt] = useState(null);
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [recordForm, setRecordForm] = useState({ diagnosis: '', prescription: '', notes: '' });
  const [showAvailabilityModal, setShowAvailabilityModal] = useState(false); // eslint-disable-line no-unused-vars
  const [availability, setAvailability] = useState([]);

  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  useEffect(() => {
    if (!profile) return;
    fetchTodayQueue();
    fetchAllAppointments();
    fetchAvailability();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  const fetchTodayQueue = async () => {
    const today = format(new Date(), 'yyyy-MM-dd');
    try {
      const data = await apiClient.getAppointments(profile.id, 'doctor');
      // Filter for today and not cancelled
      const fetched = (data || []).filter(a => a.appointment_date === today && a.status !== 'cancelled');

      // Sort: emergency > urgent > normal, then by time
      const priorityOrder = { emergency: 0, urgent: 1, normal: 2 };
      const sorted = fetched.sort((a, b) => {
        const pd = priorityOrder[a.priority] - priorityOrder[b.priority];
        if (pd !== 0) return pd;
        return a.time_slot.localeCompare(b.time_slot);
      });
      setAppointments(sorted);
    } catch (err) {
      toast.error("Failed to load today's queue");
    }
  };

  const fetchAllAppointments = async () => {
    try {
      const data = await apiClient.getAppointments(profile.id, 'doctor');
      setAllAppointments(data || []);
    } catch (err) {
      toast.error('Failed to load appointments');
    }
  };

  const fetchAvailability = async () => {
    try {
      const data = await apiClient.getAvailability(profile.id);
      setAvailability(data || []);
    } catch (err) {
      toast.error('Failed to load availability');
    }
  };

  const handleUpdateStatus = async (apptId, status) => {
    setLoading(true);
    try {
      await apiClient.updateAppointmentStatus(apptId, status);
      toast.success(`Appointment ${status}!`);
      fetchTodayQueue();
      fetchAllAppointments();
    } catch (err) {
      toast.error('Failed to update status');
    } finally {
      setLoading(false);
    }
  };

  const handleAddRecord = async (e) => {
    e.preventDefault();
    if (!recordForm.diagnosis) {
      toast.error('Please enter a diagnosis');
      return;
    }
    setLoading(true);
    try {
      await apiClient.createMedicalRecord({
        patient_id: selectedAppt.patient_id,
        doctor_id: profile.id,
        appointment_id: selectedAppt.id,
        diagnosis: recordForm.diagnosis,
        prescription: recordForm.prescription,
        notes: recordForm.notes,
      });
      toast.success('Medical record saved & appointment completed! ✅');
      setShowRecordModal(false);
      setRecordForm({ diagnosis: '', prescription: '', notes: '' });
      setSelectedAppt(null);
      fetchTodayQueue();
      fetchAllAppointments();
    } catch (err) {
      toast.error(err.message || 'Failed to save record');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAvailability = async () => {
    try {
      await apiClient.updateAvailability(profile.id, availability);
      toast.success('Availability updated!');
      setShowAvailabilityModal(false);
    } catch (err) {
      toast.error('Failed to save availability');
    }
  };

  const toggleDay = (dayIndex) => {
    const exists = availability.find(a => a.day_of_week === dayIndex);
    if (exists) {
      setAvailability(availability.filter(a => a.day_of_week !== dayIndex));
    } else {
      setAvailability([...availability, {
        day_of_week: dayIndex,
        start_time: '09:00',
        end_time: '17:00',
        slot_duration_minutes: 30,
      }]);
    }
  };

  const updateDayAvailability = (dayIndex, field, value) => {
    setAvailability(availability.map(a =>
      a.day_of_week === dayIndex ? { ...a, [field]: value } : a
    ));
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const todayStats = {
    total: appointments.length,
    emergency: appointments.filter(a => a.priority === 'emergency').length,
    urgent: appointments.filter(a => a.priority === 'urgent').length,
    completed: allAppointments.filter(a => a.status === 'completed' && a.appointment_date === format(new Date(), 'yyyy-MM-dd')).length,
  };

  const navItems = [
    { id: 'queue', icon: '🔔', label: "Today's Queue" },
    { id: 'all', icon: '📋', label: 'All Appointments' },
    { id: 'availability', icon: '🗓️', label: 'My Availability' },
  ];

  const getPriorityStyle = (priority) => {
    if (priority === 'emergency') return { borderLeft: '4px solid var(--emergency)' };
    if (priority === 'urgent') return { borderLeft: '4px solid var(--urgent)' };
    return { borderLeft: '4px solid var(--normal)' };
  };

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
            <span>Doctor Portal</span>
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
              {profile?.full_name?.[0]?.toUpperCase() || 'D'}
            </div>
            <div className="user-details">
              <h4>Dr. {profile?.full_name}</h4>
              <p>{profile?.specialty || 'Doctor'}</p>
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
              <h1>{navItems.find(n => n.id === activeTab)?.icon} {navItems.find(n => n.id === activeTab)?.label}</h1>
              <p>{format(new Date(), 'EEEE, MMMM dd, yyyy')}</p>
            </div>
          </div>
          <span className="badge badge-confirmed">👨‍⚕️ Doctor</span>
        </div>

        <div className="page-content">
          {/* ---- TODAY'S QUEUE ---- */}
          {activeTab === 'queue' && (
            <div>
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-icon" style={{ background: 'rgba(99,102,241,0.15)' }}>📅</div>
                  <div className="stat-info">
                    <h3>{todayStats.total}</h3>
                    <p>Total Today</p>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon" style={{ background: 'rgba(255,59,48,0.15)' }}>🚨</div>
                  <div className="stat-info">
                    <h3>{todayStats.emergency}</h3>
                    <p>Emergency</p>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon" style={{ background: 'rgba(255,149,0,0.15)' }}>⚠️</div>
                  <div className="stat-info">
                    <h3>{todayStats.urgent}</h3>
                    <p>Urgent</p>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon" style={{ background: 'rgba(16,185,129,0.15)' }}>✅</div>
                  <div className="stat-info">
                    <h3>{todayStats.completed}</h3>
                    <p>Completed Today</p>
                  </div>
                </div>
              </div>

              {appointments.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">🎉</div>
                  <h3>No appointments today</h3>
                  <p>Your schedule for today is clear</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {/* Priority Notice */}
                  {(todayStats.emergency > 0 || todayStats.urgent > 0) && (
                    <div style={{
                      padding: '12px 16px',
                      borderRadius: 'var(--radius-md)',
                      background: 'rgba(255,59,48,0.1)',
                      border: '1px solid rgba(255,59,48,0.3)',
                      color: 'var(--emergency)',
                      fontSize: '13px',
                      fontWeight: '600',
                    }}>
                      🚨 {todayStats.emergency} emergency and {todayStats.urgent} urgent cases — handle them first!
                    </div>
                  )}

                  {appointments.map((appt, idx) => (
                    <div
                      key={appt.id}
                      className="card"
                      style={{ padding: '20px', ...getPriorityStyle(appt.priority) }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                        <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                          <div style={{
                            width: '44px', height: '44px', borderRadius: '50%',
                            background: 'linear-gradient(135deg, var(--secondary), var(--primary))',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '18px', fontWeight: '700', color: 'white',
                          }}>
                            {idx + 1}
                          </div>
                          <div>
                            <div style={{ fontWeight: '700', fontSize: '15px' }}>{appt.patient?.full_name}</div>
                            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                              {appt.patient?.phone} · {appt.patient?.gender}
                            </div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          <span className={`badge badge-${appt.priority}`}>
                            {appt.priority === 'emergency' ? '🚨' : appt.priority === 'urgent' ? '⚠️' : '✅'} {appt.priority}
                          </span>
                          <span className={`badge badge-${appt.status}`}>{appt.status}</span>
                          <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--primary-light)' }}>
                            ⏰ {appt.time_slot}
                          </span>
                        </div>
                      </div>

                      {appt.reason && (
                        <div style={{ marginTop: '12px', padding: '10px', background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)', fontSize: '13px', color: 'var(--text-secondary)' }}>
                          📋 {appt.reason}
                        </div>
                      )}

                      <div style={{ marginTop: '14px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {appt.status === 'pending' && (
                          <button
                            className="btn btn-success btn-sm"
                            onClick={() => handleUpdateStatus(appt.id, 'confirmed')}
                            disabled={loading}
                          >
                            ✅ Confirm
                          </button>
                        )}
                        {appt.status === 'confirmed' && (
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => { setSelectedAppt(appt); setShowRecordModal(true); }}
                          >
                            🗂️ Complete & Add Record
                          </button>
                        )}
                        {['pending', 'confirmed'].includes(appt.status) && (
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => handleUpdateStatus(appt.id, 'cancelled')}
                            disabled={loading}
                          >
                            ❌ Cancel
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ---- ALL APPOINTMENTS ---- */}
          {activeTab === 'all' && (
            <div>
              {allAppointments.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">📋</div>
                  <h3>No appointments yet</h3>
                  <p>Patient appointments will appear here</p>
                </div>
              ) : (
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Patient</th>
                        <th>Date</th>
                        <th>Time</th>
                        <th>Priority</th>
                        <th>Status</th>
                        <th>Reason</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allAppointments.map(appt => (
                        <tr key={appt.id}>
                          <td>
                            <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{appt.patient?.full_name}</div>
                            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{appt.patient?.phone}</div>
                          </td>
                          <td>{format(new Date(appt.appointment_date + 'T00:00:00'), 'MMM dd, yyyy')}</td>
                          <td>{appt.time_slot}</td>
                          <td><span className={`badge badge-${appt.priority}`}>{appt.priority}</span></td>
                          <td><span className={`badge badge-${appt.status}`}>{appt.status}</span></td>
                          <td style={{ maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {appt.reason || '—'}
                          </td>
                          <td>
                            {appt.status === 'confirmed' && (
                              <button
                                className="btn btn-primary btn-sm"
                                onClick={() => { setSelectedAppt(appt); setShowRecordModal(true); }}
                              >
                                + Record
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ---- AVAILABILITY ---- */}
          {activeTab === 'availability' && (
            <div className="card">
              <div className="section-header">
                <span className="section-title">🗓️ Set Your Working Days</span>
                <button className="btn btn-primary btn-sm" onClick={handleSaveAvailability}>
                  💾 Save Availability
                </button>
              </div>
              <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '20px' }}>
                Select the days you are available and set your working hours.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {days.map((day, idx) => {
                  const avail = availability.find(a => a.day_of_week === idx);
                  return (
                    <div
                      key={day}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '16px',
                        padding: '14px 16px',
                        borderRadius: 'var(--radius-md)',
                        border: `1.5px solid ${avail ? 'var(--primary)' : 'var(--border)'}`,
                        background: avail ? 'rgba(99,102,241,0.08)' : 'var(--bg-input)',
                        flexWrap: 'wrap',
                      }}
                    >
                      <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', minWidth: '130px' }}>
                        <input
                          type="checkbox"
                          checked={!!avail}
                          onChange={() => toggleDay(idx)}
                          style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                        />
                        <span style={{ fontWeight: '600', color: avail ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                          {day}
                        </span>
                      </label>

                      {avail && (
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>From</span>
                            <input
                              type="time"
                              className="form-input"
                              style={{ width: '120px', padding: '6px 10px' }}
                              value={avail.start_time}
                              onChange={(e) => updateDayAvailability(idx, 'start_time', e.target.value)}
                            />
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>To</span>
                            <input
                              type="time"
                              className="form-input"
                              style={{ width: '120px', padding: '6px 10px' }}
                              value={avail.end_time}
                              onChange={(e) => updateDayAvailability(idx, 'end_time', e.target.value)}
                            />
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Slot</span>
                            <select
                              className="form-select"
                              style={{ width: '100px', padding: '6px 10px' }}
                              value={avail.slot_duration_minutes}
                              onChange={(e) => updateDayAvailability(idx, 'slot_duration_minutes', parseInt(e.target.value))}
                            >
                              <option value={15}>15 min</option>
                              <option value={30}>30 min</option>
                              <option value={45}>45 min</option>
                              <option value={60}>60 min</option>
                            </select>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Medical Record Modal */}
      {showRecordModal && selectedAppt && (
        <div className="modal-overlay" onClick={() => setShowRecordModal(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">🗂️ Add Medical Record</span>
              <button className="modal-close" onClick={() => setShowRecordModal(false)}>✕</button>
            </div>

            <div style={{ marginBottom: '20px', padding: '12px', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontSize: '14px', fontWeight: '600' }}>Patient: {selectedAppt.patient?.full_name}</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                {selectedAppt.appointment_date} at {selectedAppt.time_slot}
              </div>
              {selectedAppt.reason && (
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  Reason: {selectedAppt.reason}
                </div>
              )}
            </div>

            <form onSubmit={handleAddRecord}>
              <div className="form-group">
                <label className="form-label">Diagnosis *</label>
                <textarea
                  className="form-textarea"
                  placeholder="Enter diagnosis..."
                  value={recordForm.diagnosis}
                  onChange={(e) => setRecordForm({ ...recordForm, diagnosis: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Prescription</label>
                <textarea
                  className="form-textarea"
                  placeholder="Medicines, dosage, frequency..."
                  value={recordForm.prescription}
                  onChange={(e) => setRecordForm({ ...recordForm, prescription: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Doctor's Notes</label>
                <textarea
                  className="form-textarea"
                  placeholder="Follow-up instructions, lifestyle advice..."
                  value={recordForm.notes}
                  onChange={(e) => setRecordForm({ ...recordForm, notes: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? '⏳ Saving...' : '✅ Save & Complete'}
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => setShowRecordModal(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DoctorDashboard;
