import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../api/apiClient';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { format, subDays } from 'date-fns';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#8b5cf6'];

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  
  // States for Hospital Data
  const [stats, setStats] = useState({ patients: 0, doctors: 0, todayAppts: 0, totalAppts: 0, bedOccupancy: 0, revenue: 0, lowStock: 0 });
  const [allAppointments, setAllAppointments] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [bedsData, setBedsData] = useState({ beds: [], stats: {} });
  const [billingData, setBillingData] = useState({ invoices: [], stats: {} });
  const [pharmacyData, setPharmacyData] = useState({ items: [], stats: {} });
  const [auditLogs, setAuditLogs] = useState([]);

  // Analytics Chart Data
  const [weeklyData, setWeeklyData] = useState([]);
  const [statusData, setStatusData] = useState([]);
  const [priorityData, setPriorityData] = useState([]);
  const [doctorStats, setDoctorStats] = useState([]);
  
  // Filters & Modals
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [wardFilter, setWardFilter] = useState('All');
  const [selectedBed, setSelectedBed] = useState(null);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [showAddMedicineModal, setShowAddMedicineModal] = useState(false);
  const [showCreateInvoiceModal, setShowCreateInvoiceModal] = useState(false);

  // New Form Inputs
  const [newMedicine, setNewMedicine] = useState({ name: '', generic_name: '', category: 'Painkillers', stock_quantity: 100, unit_price: 25 });
  const [newInvoice, setNewInvoice] = useState({ patient_id: '', items: [{ description: 'General Consultation', category: 'Consultation', amount: 800 }] });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!profile) return;
    fetchAllData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  const fetchAllData = async () => {
    setLoading(true);
    await Promise.all([
      fetchAppointments(),
      fetchUsers(),
      fetchBeds(),
      fetchBilling(),
      fetchPharmacy(),
      fetchAudit(),
    ]);
    setLoading(false);
  };

  const fetchAppointments = async () => {
    try {
      const appts = await apiClient.getAppointments(null, 'admin');
      setAllAppointments(appts);

      const weekly = Array.from({ length: 7 }, (_, i) => {
        const d = subDays(new Date(), 6 - i);
        const dateStr = format(d, 'yyyy-MM-dd');
        return {
          day: format(d, 'EEE'),
          count: appts.filter(a => a.appointment_date === dateStr).length,
        };
      });
      setWeeklyData(weekly);

      const statusMap = {};
      appts.forEach(a => { statusMap[a.status] = (statusMap[a.status] || 0) + 1; });
      setStatusData(Object.entries(statusMap).map(([name, value]) => ({ name, value })));

      const priMap = {};
      appts.forEach(a => { priMap[a.priority] = (priMap[a.priority] || 0) + 1; });
      setPriorityData(Object.entries(priMap).map(([name, value]) => ({ name, value })));

      const docMap = {};
      appts.forEach(a => {
        const name = a.doctor?.full_name || 'Unknown';
        if (!docMap[name]) docMap[name] = { name, total: 0, completed: 0, specialty: a.doctor?.specialty };
        docMap[name].total++;
        if (a.status === 'completed') docMap[name].completed++;
      });
      setDoctorStats(Object.values(docMap).sort((a, b) => b.total - a.total));

      const today = format(new Date(), 'yyyy-MM-dd');
      setStats(prev => ({
        ...prev,
        todayAppts: appts.filter(a => a.appointment_date === today).length,
        totalAppts: appts.length,
      }));
    } catch (err) {
      console.error(err);
    }
  };

  const fetchUsers = async () => {
    try {
      const users = await apiClient.getUsers();
      setAllUsers(users);
      setStats(prev => ({
        ...prev,
        patients: users.filter(u => u.role === 'patient').length,
        doctors: users.filter(u => u.role === 'doctor').length,
      }));
    } catch (err) {
      console.error(err);
    }
  };

  const fetchBeds = async () => {
    try {
      const res = await apiClient.getBeds();
      setBedsData(res);
      setStats(prev => ({ ...prev, bedOccupancy: res.stats?.occupancy_rate || 0 }));
    } catch (err) {
      console.error(err);
    }
  };

  const fetchBilling = async () => {
    try {
      const res = await apiClient.getInvoices();
      setBillingData(res);
      setStats(prev => ({ ...prev, revenue: res.stats?.total_revenue || 0 }));
    } catch (err) {
      console.error(err);
    }
  };

  const fetchPharmacy = async () => {
    try {
      const res = await apiClient.getPharmacyInventory();
      setPharmacyData(res);
      setStats(prev => ({ ...prev, lowStock: res.stats?.low_stock_alerts || 0 }));
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAudit = async () => {
    try {
      const logs = await apiClient.getAuditLogs();
      setAuditLogs(logs);
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateBedStatus = async (bedId, status, patientId = null) => {
    try {
      await apiClient.updateBedStatus(bedId, status, patientId);
      toast.success(`Bed status updated to ${status}`);
      setSelectedBed(null);
      fetchBeds();
    } catch (err) {
      toast.error('Failed to update bed status');
    }
  };

  const handlePayInvoice = async (invoiceId) => {
    try {
      await apiClient.payInvoice(invoiceId, 'Card');
      toast.success('Invoice marked as Paid!');
      fetchBilling();
      if (selectedInvoice && (selectedInvoice.id === invoiceId || selectedInvoice._id === invoiceId)) {
        setSelectedInvoice(prev => ({ ...prev, payment_status: 'Paid', payment_method: 'Card' }));
      }
    } catch (err) {
      toast.error('Failed to process payment');
    }
  };

  const handleAddMedicine = async (e) => {
    e.preventDefault();
    try {
      await apiClient.addMedicine(newMedicine);
      toast.success(`Added ${newMedicine.name} to pharmacy stock`);
      setShowAddMedicineModal(false);
      setNewMedicine({ name: '', generic_name: '', category: 'Painkillers', stock_quantity: 100, unit_price: 25 });
      fetchPharmacy();
    } catch (err) {
      toast.error('Failed to add medicine');
    }
  };

  const handleAdjustStock = async (itemId, change) => {
    try {
      await apiClient.updateMedicineStock(itemId, change);
      toast.success('Stock adjusted');
      fetchPharmacy();
    } catch (err) {
      toast.error('Failed to adjust stock');
    }
  };

  const handleSignOut = async () => { await signOut(); navigate('/'); };

  const navItems = [
    { id: 'overview', icon: '📊', label: 'Overview' },
    { id: 'beds', icon: '🛏️', label: 'Beds & Wards' },
    { id: 'billing', icon: '💳', label: 'Invoices & Billing' },
    { id: 'pharmacy', icon: '💊', label: 'Pharmacy Stock' },
    { id: 'appointments', icon: '📅', label: 'Appointments' },
    { id: 'users', icon: '👥', label: 'Hospital Staff' },
    { id: 'audit', icon: '📜', label: 'Audit Logs' },
  ];

  const filteredBeds = bedsData.beds.filter(b => wardFilter === 'All' || b.ward === wardFilter);

  return (
    <div className="dashboard-layout">
      {mobileNavOpen && <div className="sidebar-backdrop" onClick={() => setMobileNavOpen(false)} />}

      <aside className={`sidebar ${mobileNavOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-logo">
          <div className="logo-icon">🏥</div>
          <div className="logo-text"><h2>MedVault</h2><span>Hospital Information System</span></div>
          {mobileNavOpen && (
            <button onClick={() => setMobileNavOpen(false)} style={{ marginLeft: 'auto', background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'var(--text-muted)' }}>✕</button>
          )}
        </div>

        <nav className="sidebar-nav">
          <div className="nav-label">Management Modules</div>
          {navItems.map(item => (
            <button
              key={item.id}
              className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
              onClick={() => { setActiveTab(item.id); setMobileNavOpen(false); }}
            >
              <span className="nav-icon">{item.icon}</span>{item.label}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-avatar">{profile?.full_name?.[0]?.toUpperCase() || 'A'}</div>
            <div className="user-details"><h4>{profile?.full_name}</h4><p>Hospital Admin</p></div>
          </div>
          <button className="btn btn-secondary btn-full btn-sm" onClick={handleSignOut}>🚪 Sign Out</button>
        </div>
      </aside>

      <main className="main-content">
        <div className="dashboard-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button className="mobile-nav-toggle" onClick={() => setMobileNavOpen(!mobileNavOpen)}>
              {mobileNavOpen ? '✕' : '☰'}
            </button>
            <div className="header-title">
              <h1>{navItems.find(n => n.id === activeTab)?.icon} {navItems.find(n => n.id === activeTab)?.label}</h1>
              <p>Live Database Connection • {format(new Date(), 'EEEE, MMMM dd, yyyy')}</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span className="badge badge-emergency">🛡️ Director Dashboard</span>
          </div>
        </div>

        <div className="page-content">
          {/* OVERVIEW MODULE */}
          {activeTab === 'overview' && (
            <div>
              <div className="stats-grid">
                {[
                  { icon: '🧑', label: 'Total Patients', value: stats.patients, color: 'rgba(99,102,241,0.15)' },
                  { icon: '👨‍⚕️', label: 'Specialist Doctors', value: stats.doctors, color: 'rgba(6,182,212,0.15)' },
                  { icon: '🛏️', label: 'Bed Occupancy', value: `${stats.bedOccupancy}%`, color: 'rgba(239,68,68,0.15)' },
                  { icon: '💰', label: 'Total Revenue', value: `₹${stats.revenue.toLocaleString()}`, color: 'rgba(16,185,129,0.15)' },
                  { icon: '💊', label: 'Low Stock Alerts', value: stats.lowStock, color: 'rgba(245,158,11,0.15)' },
                  { icon: '📅', label: "Today's Appointments", value: stats.todayAppts, color: 'rgba(139,92,246,0.15)' },
                ].map((s, i) => (
                  <div className="stat-card" key={i}>
                    <div className="stat-icon" style={{ background: s.color }}>{s.icon}</div>
                    <div className="stat-info"><h3>{s.value}</h3><p>{s.label}</p></div>
                  </div>
                ))}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20, marginBottom: 20 }}>
                <div className="card">
                  <div className="section-title" style={{ marginBottom: 20 }}>📊 Daily Patient Appointments</div>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={weeklyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="day" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} />
                      <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} />
                      <Tooltip contentStyle={{ background: '#fff', borderRadius: 8, color: '#000' }} />
                      <Bar dataKey="count" fill="#4f46e5" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="card">
                  <div className="section-title" style={{ marginBottom: 20 }}>🥧 Appointment Statuses</div>
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={statusData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                        {statusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {/* BEDS & WARD MANAGEMENT */}
          {activeTab === 'beds' && (
            <div>
              <div className="section-header">
                <span className="section-title">Hospital Ward Beds ({filteredBeds.length})</span>
                <div style={{ display: 'flex', gap: 10 }}>
                  {['All', 'ICU', 'Emergency', 'General Ward', 'VIP Suite', 'Pediatrics'].map(w => (
                    <button key={w} className={`btn btn-sm ${wardFilter === w ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setWardFilter(w)}>
                      {w}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bed-grid">
                {filteredBeds.map(bed => (
                  <div key={bed.id || bed._id} className={`bed-card status-${bed.status}`}>
                    <div className="bed-header">
                      <span className="bed-number">{bed.bed_number}</span>
                      <span className={`badge badge-${bed.status.toLowerCase()}`}>{bed.status}</span>
                    </div>
                    <div className="bed-details">
                      <div>🏢 Ward: <strong>{bed.ward}</strong> (Room {bed.room_number})</div>
                      <div>💵 Rate: <strong>₹{bed.daily_rate}/day</strong></div>
                      {bed.patient_id && (
                        <div style={{ color: 'var(--primary-dark)', fontWeight: 600, marginTop: 4 }}>
                          👤 Patient: {bed.patient_id.full_name || bed.patient_id.email}
                        </div>
                      )}
                      {bed.notes && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>📝 {bed.notes}</div>}
                    </div>

                    <div className="bed-actions">
                      <button className="btn btn-secondary btn-sm btn-full" onClick={() => setSelectedBed(bed)}>
                        ⚙️ Manage Status
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* INVOICES & BILLING */}
          {activeTab === 'billing' && (
            <div>
              <div className="section-header">
                <span className="section-title">Hospital Billing & Invoices</span>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button className="btn btn-primary btn-sm" onClick={() => setShowCreateInvoiceModal(true)}>
                    ➕ Generate New Invoice
                  </button>
                </div>
              </div>

              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Invoice #</th>
                      <th>Patient</th>
                      <th>Items</th>
                      <th>Total Amount</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {billingData.invoices.map(inv => (
                      <tr key={inv.id || inv._id}>
                        <td><strong>{inv.invoice_number}</strong></td>
                        <td>{inv.patient_id?.full_name || inv.patient_id?.email || 'Walk-in Patient'}</td>
                        <td>{inv.items?.length || 0} line items</td>
                        <td><strong style={{ color: 'var(--primary)' }}>₹{inv.total_amount}</strong></td>
                        <td>
                          <span className={`badge badge-${inv.payment_status === 'Paid' ? 'confirmed' : 'pending'}`}>
                            {inv.payment_status}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button className="btn btn-secondary btn-sm" onClick={() => setSelectedInvoice(inv)}>
                              📄 View Receipt
                            </button>
                            {inv.payment_status === 'Pending' && (
                              <button className="btn btn-success btn-sm" onClick={() => handlePayInvoice(inv.id || inv._id)}>
                                💳 Mark Paid
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* PHARMACY MODULE */}
          {activeTab === 'pharmacy' && (
            <div>
              <div className="section-header">
                <span className="section-title">Pharmacy Medicine Stock</span>
                <button className="btn btn-primary btn-sm" onClick={() => setShowAddMedicineModal(true)}>
                  ➕ Add New Medicine
                </button>
              </div>

              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Medicine Name</th>
                      <th>Category</th>
                      <th>In Stock</th>
                      <th>Unit Price</th>
                      <th>Reorder Level</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pharmacyData.items.map(item => (
                      <tr key={item.id || item._id}>
                        <td>
                          <div style={{ fontWeight: 700 }}>{item.name}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{item.generic_name} • {item.location}</div>
                        </td>
                        <td><span className="badge badge-completed">{item.category}</span></td>
                        <td>
                          <span style={{ fontWeight: 700, color: item.stock_quantity <= item.reorder_level ? 'var(--danger)' : 'var(--text-primary)' }}>
                            {item.stock_quantity} units
                          </span>
                          {item.stock_quantity <= item.reorder_level && (
                            <span className="badge badge-emergency" style={{ marginLeft: 6 }}>Low Stock</span>
                          )}
                        </td>
                        <td>₹{item.unit_price}</td>
                        <td>{item.reorder_level} units</td>
                        <td>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button className="btn btn-secondary btn-sm" onClick={() => handleAdjustStock(item.id || item._id, 25)}>
                              +25 Restock
                            </button>
                            <button className="btn btn-secondary btn-sm" onClick={() => handleAdjustStock(item.id || item._id, -5)}>
                              -5 Dispense
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* APPOINTMENTS MODULE */}
          {activeTab === 'appointments' && (
            <div>
              <div className="section-header">
                <span className="section-title">All Appointments ({allAppointments.length})</span>
              </div>
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Patient</th>
                      <th>Doctor</th>
                      <th>Date</th>
                      <th>Time</th>
                      <th>Priority</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allAppointments.map(a => (
                      <tr key={a.id || a._id}>
                        <td>{a.patient?.full_name || 'Patient'}</td>
                        <td>Dr. {a.doctor?.full_name || 'Doctor'}</td>
                        <td>{a.appointment_date}</td>
                        <td>{a.time_slot}</td>
                        <td><span className={`badge badge-${a.priority}`}>{a.priority}</span></td>
                        <td><span className={`badge badge-${a.status}`}>{a.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* USERS MODULE */}
          {activeTab === 'users' && (
            <div>
              <div className="section-header"><span className="section-title">Registered Users & Staff</span></div>
              <div className="table-container">
                <table>
                  <thead>
                    <tr><th>Name</th><th>Role</th><th>Phone</th><th>Specialty</th></tr>
                  </thead>
                  <tbody>
                    {allUsers.map(u => (
                      <tr key={u.id || u._id}>
                        <td><strong>{u.full_name}</strong><br/><span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{u.email}</span></td>
                        <td><span className={`badge badge-${u.role === 'admin' ? 'emergency' : u.role === 'doctor' ? 'confirmed' : 'normal'}`}>{u.role}</span></td>
                        <td>{u.phone || '—'}</td>
                        <td>{u.specialty || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* AUDIT LOGS MODULE */}
          {activeTab === 'audit' && (
            <div>
              <div className="section-header"><span className="section-title">System Audit & Event Activity</span></div>
              <div className="table-container">
                <table>
                  <thead>
                    <tr><th>Timestamp</th><th>Action</th><th>User</th><th>Category</th><th>Details</th></tr>
                  </thead>
                  <tbody>
                    {auditLogs.map(log => (
                      <tr key={log.id || log._id}>
                        <td>{format(new Date(log.createdAt || log.timestamp || Date.now()), 'MMM dd, HH:mm:ss')}</td>
                        <td><strong style={{ color: 'var(--primary)' }}>{log.action}</strong></td>
                        <td>{log.user_name} ({log.user_role})</td>
                        <td><span className="badge badge-normal">{log.category || 'SYSTEM'}</span></td>
                        <td>{log.details}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* MODAL: MANAGE BED STATUS */}
        {selectedBed && (
          <div className="modal-overlay" onClick={() => setSelectedBed(null)}>
            <div className="modal-box" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h3 className="modal-title">Manage Bed {selectedBed.bed_number}</h3>
                <button className="modal-close" onClick={() => setSelectedBed(null)}>✕</button>
              </div>
              <p style={{ marginBottom: 16 }}>Ward: <strong>{selectedBed.ward}</strong> (Room {selectedBed.room_number})</p>
              
              <div className="form-group">
                <label className="form-label">Set Status</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {['Available', 'Occupied', 'Cleaning', 'Maintenance'].map(st => (
                    <button
                      key={st}
                      className={`btn ${selectedBed.status === st ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => handleUpdateBedStatus(selectedBed.id || selectedBed._id, st, st === 'Available' ? null : selectedBed.patient_id)}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: INVOICE RECEIPT VIEW */}
        {selectedInvoice && (
          <div className="modal-overlay" onClick={() => setSelectedInvoice(null)}>
            <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 650 }}>
              <div className="modal-header">
                <h3 className="modal-title">Invoice Receipt #{selectedInvoice.invoice_number}</h3>
                <button className="modal-close" onClick={() => setSelectedInvoice(null)}>✕</button>
              </div>

              <div className="invoice-receipt">
                <div className="receipt-header">
                  <div>
                    <h2 style={{ color: '#4f46e5', margin: 0 }}>MedVault Hospital</h2>
                    <p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>Healthcare Local Database System</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 16, fontWeight: 700 }}>{selectedInvoice.invoice_number}</div>
                    <div style={{ fontSize: 12, color: '#64748b' }}>Date: {format(new Date(selectedInvoice.createdAt || Date.now()), 'MMM dd, yyyy')}</div>
                  </div>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <strong>Billed To:</strong> {selectedInvoice.patient_id?.full_name || selectedInvoice.patient_id?.email || 'Walk-in Patient'}
                </div>

                <table className="receipt-table">
                  <thead>
                    <tr><th>Item Description</th><th>Category</th><th>Amount</th></tr>
                  </thead>
                  <tbody>
                    {selectedInvoice.items?.map((item, idx) => (
                      <tr key={idx}>
                        <td>{item.description}</td>
                        <td>{item.category}</td>
                        <td>₹{item.amount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="receipt-summary">
                  <div>Subtotal: ₹{selectedInvoice.subtotal}</div>
                  <div>Tax: ₹{selectedInvoice.tax || 0}</div>
                  <div>Discount: -₹{selectedInvoice.discount || 0}</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#4f46e5', marginTop: 6 }}>
                    Total Paid: ₹{selectedInvoice.total_amount}
                  </div>
                  <span className={`badge badge-${selectedInvoice.payment_status === 'Paid' ? 'confirmed' : 'pending'}`} style={{ marginTop: 6 }}>
                    Status: {selectedInvoice.payment_status} ({selectedInvoice.payment_method || 'Unpaid'})
                  </span>
                </div>
              </div>

              <div style={{ marginTop: 20, display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button className="btn btn-secondary" onClick={() => window.print()}>🖨️ Print Receipt</button>
                {selectedInvoice.payment_status === 'Pending' && (
                  <button className="btn btn-success" onClick={() => handlePayInvoice(selectedInvoice.id || selectedInvoice._id)}>
                    💳 Record Payment Now
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* MODAL: ADD MEDICINE */}
        {showAddMedicineModal && (
          <div className="modal-overlay" onClick={() => setShowAddMedicineModal(false)}>
            <div className="modal-box" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h3 className="modal-title">Add Drug / Medicine to Pharmacy</h3>
                <button className="modal-close" onClick={() => setShowAddMedicineModal(false)}>✕</button>
              </div>

              <form onSubmit={handleAddMedicine}>
                <div className="form-group">
                  <label className="form-label">Medicine Brand Name</label>
                  <input className="form-input" required value={newMedicine.name} onChange={e => setNewMedicine({ ...newMedicine, name: e.target.value })} placeholder="e.g. Paracetamol 650mg" />
                </div>
                <div className="form-group">
                  <label className="form-label">Generic Compound Name</label>
                  <input className="form-input" value={newMedicine.generic_name} onChange={e => setNewMedicine({ ...newMedicine, generic_name: e.target.value })} placeholder="e.g. Acetaminophen" />
                </div>
                <div className="form-group">
                  <label className="form-label">Category</label>
                  <select className="form-select" value={newMedicine.category} onChange={e => setNewMedicine({ ...newMedicine, category: e.target.value })}>
                    {['Antibiotics', 'Painkillers', 'Cardiovascular', 'Dermatology', 'Neurology', 'Pediatric', 'Vitamins & Supplements'].map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div className="form-group">
                    <label className="form-label">Stock Quantity</label>
                    <input className="form-input" type="number" required value={newMedicine.stock_quantity} onChange={e => setNewMedicine({ ...newMedicine, stock_quantity: Number(e.target.value) })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Unit Price (₹)</label>
                    <input className="form-input" type="number" required value={newMedicine.unit_price} onChange={e => setNewMedicine({ ...newMedicine, unit_price: Number(e.target.value) })} />
                  </div>
                </div>
                <button type="submit" className="btn btn-primary btn-full" style={{ marginTop: 16 }}>Save Medicine</button>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminDashboard;
