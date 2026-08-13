import { format, subDays } from 'date-fns';

// Helper to generate IDs
const uuid = () => Math.random().toString(36).substring(2, 15);

// Key names
const KEYS = {
  USERS: 'medcare_users',
  APPOINTMENTS: 'medcare_appointments',
  RECORDS: 'medcare_records',
  AVAILABILITY: 'medcare_availability',
  BEDS: 'medcare_beds',
  BILLING: 'medcare_billing',
  PHARMACY: 'medcare_pharmacy',
  AUDIT: 'medcare_audit',
  SESSION: 'medcare_session',
};

// Initial Seed Data
const defaultDoctors = [
  {
    id: 'doc-priya',
    email: 'doctor@demo.com',
    full_name: 'Priya Sharma',
    role: 'doctor',
    phone: '+91 98765 43210',
    gender: 'female',
    specialty: 'Cardiologist',
    created_at: subDays(new Date(), 10).toISOString(),
  },
  {
    id: 'doc-aravind',
    email: 'aravind@demo.com',
    full_name: 'Aravind Swamy',
    role: 'doctor',
    phone: '+91 98765 43211',
    gender: 'male',
    specialty: 'Neurologist',
    created_at: subDays(new Date(), 9).toISOString(),
  },
  {
    id: 'doc-ananya',
    email: 'ananya@demo.com',
    full_name: 'Ananya Roy',
    role: 'doctor',
    phone: '+91 98765 43212',
    gender: 'female',
    specialty: 'Dermatologist',
    created_at: subDays(new Date(), 8).toISOString(),
  },
  {
    id: 'doc-vikram',
    email: 'vikram@demo.com',
    full_name: 'Vikram Malhotra',
    role: 'doctor',
    phone: '+91 98765 43213',
    gender: 'male',
    specialty: 'Pediatrician',
    created_at: subDays(new Date(), 7).toISOString(),
  },
  {
    id: 'doc-sunita',
    email: 'sunita@demo.com',
    full_name: 'Sunita Rao',
    role: 'doctor',
    phone: '+91 98765 43214',
    gender: 'female',
    specialty: 'Orthopedic',
    created_at: subDays(new Date(), 6).toISOString(),
  },
];

const defaultPatients = [
  {
    id: 'pat-demo',
    email: 'patient@demo.com',
    full_name: 'Ravi Kumar',
    role: 'patient',
    phone: '+91 99887 76655',
    gender: 'male',
    date_of_birth: '1995-05-15',
    created_at: subDays(new Date(), 15).toISOString(),
  },
  {
    id: 'pat-2',
    email: 'anita@demo.com',
    full_name: 'Anita Desai',
    role: 'patient',
    phone: '+91 99887 76656',
    gender: 'female',
    date_of_birth: '1992-08-22',
    created_at: subDays(new Date(), 12).toISOString(),
  },
  {
    id: 'pat-3',
    email: 'arjun@demo.com',
    full_name: 'Arjun Singh',
    role: 'patient',
    phone: '+91 99887 76657',
    gender: 'male',
    date_of_birth: '1988-11-10',
    created_at: subDays(new Date(), 7).toISOString(),
  },
];

const defaultAdmins = [
  {
    id: 'admin-demo',
    email: 'admin@demo.com',
    full_name: 'Admin User',
    role: 'admin',
    created_at: subDays(new Date(), 30).toISOString(),
  },
];

const generateAppointments = () => {
  const appts = [];
  const todayStr = format(new Date(), 'yyyy-MM-dd');

  appts.push(
    {
      id: 'appt-1',
      patient_id: 'pat-demo',
      doctor_id: 'doc-priya',
      appointment_date: todayStr,
      time_slot: '09:00',
      status: 'pending',
      priority: 'emergency',
      reason: 'Severe chest pain and short breath since morning.',
      created_at: new Date().toISOString(),
    },
    {
      id: 'appt-2',
      patient_id: 'pat-2',
      doctor_id: 'doc-priya',
      appointment_date: todayStr,
      time_slot: '09:30',
      status: 'confirmed',
      priority: 'urgent',
      reason: 'Extremely high blood pressure reading.',
      created_at: subDays(new Date(), 1).toISOString(),
    },
    {
      id: 'appt-3',
      patient_id: 'pat-3',
      doctor_id: 'doc-priya',
      appointment_date: todayStr,
      time_slot: '10:00',
      status: 'confirmed',
      priority: 'normal',
      reason: 'Routine checkup for post-surgery recovery.',
      created_at: subDays(new Date(), 2).toISOString(),
    }
  );

  for (let i = 1; i <= 6; i++) {
    const d = subDays(new Date(), i);
    const dStr = format(d, 'yyyy-MM-dd');
    appts.push(
      {
        id: `appt-old-${i}-1`,
        patient_id: 'pat-3',
        doctor_id: 'doc-aravind',
        appointment_date: dStr,
        time_slot: '11:00',
        status: 'completed',
        priority: 'normal',
        reason: 'Migraine and headache consulting.',
        created_at: d.toISOString(),
      },
      {
        id: `appt-old-${i}-2`,
        patient_id: 'pat-2',
        doctor_id: 'doc-vikram',
        appointment_date: dStr,
        time_slot: '14:30',
        status: 'completed',
        priority: 'urgent',
        reason: 'Pediatric checkup.',
        created_at: d.toISOString(),
      }
    );
  }

  return appts;
};

const defaultRecords = [
  {
    id: 'rec-1',
    patient_id: 'pat-demo',
    doctor_id: 'doc-priya',
    appointment_id: 'appt-1',
    diagnosis: 'Primary Essential Hypertension & Sinus Tachycardia',
    prescription: '1. Amlodipine 5mg - 1 tablet daily\n2. Metoprolol 25mg - 1 tablet twice daily',
    notes: 'Patient reported morning headaches. BP was 148/92.',
    created_at: subDays(new Date(), 1).toISOString(),
  },
];

const defaultBeds = [
  { id: 'bed-101', bed_number: 'ICU-101', ward: 'ICU', room_number: '101', status: 'Occupied', patient_id: 'pat-demo', daily_rate: 5500, notes: 'Cardiac Monitoring Active' },
  { id: 'bed-102', bed_number: 'ICU-102', ward: 'ICU', room_number: '102', status: 'Available', patient_id: null, daily_rate: 5500, notes: 'Ventilator Ready' },
  { id: 'bed-201', bed_number: 'EMG-201', ward: 'Emergency', room_number: '201', status: 'Occupied', patient_id: 'pat-3', daily_rate: 3000, notes: 'Observation Room' },
  { id: 'bed-202', bed_number: 'EMG-202', ward: 'Emergency', room_number: '202', status: 'Cleaning', patient_id: null, daily_rate: 3000, notes: 'Disinfected post-discharge' },
  { id: 'bed-301', bed_number: 'GEN-301', ward: 'General Ward', room_number: '301', status: 'Occupied', patient_id: 'pat-2', daily_rate: 1500, notes: 'Dermatology Care' },
  { id: 'bed-302', bed_number: 'GEN-302', ward: 'General Ward', room_number: '302', status: 'Available', patient_id: null, daily_rate: 1500, notes: 'Window view bed' },
  { id: 'bed-401', bed_number: 'VIP-401', ward: 'VIP Suite', room_number: '401', status: 'Available', patient_id: null, daily_rate: 8000, notes: 'Luxury Suite' },
  { id: 'bed-501', bed_number: 'PED-501', ward: 'Pediatrics', room_number: '501', status: 'Available', patient_id: null, daily_rate: 2200, notes: 'Pediatric Bed' },
];

const defaultPharmacy = [
  { id: 'med-1', name: 'Paracetamol 650mg', generic_name: 'Acetaminophen', category: 'Painkillers', stock_quantity: 450, reorder_level: 50, unit_price: 15, expiry_date: '2027-12-31', manufacturer: 'MedVault Labs', location: 'Shelf A-1' },
  { id: 'med-2', name: 'Amoxicillin 500mg', generic_name: 'Amoxicillin Trihydrate', category: 'Antibiotics', stock_quantity: 120, reorder_level: 30, unit_price: 45, expiry_date: '2026-11-20', manufacturer: 'Sun Pharma', location: 'Shelf A-2' },
  { id: 'med-3', name: 'Amlodipine 5mg', generic_name: 'Amlodipine Besylate', category: 'Cardiovascular', stock_quantity: 200, reorder_level: 40, unit_price: 25, expiry_date: '2028-05-15', manufacturer: 'Cipla Ltd', location: 'Shelf B-1' },
  { id: 'med-4', name: 'Cetirizine 10mg', generic_name: 'Cetirizine HCl', category: 'Dermatology', stock_quantity: 15, reorder_level: 25, unit_price: 12, expiry_date: '2027-08-10', manufacturer: 'Dr. Reddys', location: 'Shelf B-3' },
  { id: 'med-5', name: 'Metoprolol 25mg', generic_name: 'Metoprolol Succinate', category: 'Cardiovascular', stock_quantity: 180, reorder_level: 30, unit_price: 35, expiry_date: '2027-03-30', manufacturer: 'Zydus', location: 'Shelf B-2' },
  { id: 'med-6', name: 'Rizatriptan 10mg', generic_name: 'Rizatriptan Benzoate', category: 'Neurology', stock_quantity: 8, reorder_level: 15, unit_price: 85, expiry_date: '2026-09-15', manufacturer: 'Lupin', location: 'Shelf C-1' },
];

const defaultBilling = [
  {
    id: 'inv-1',
    invoice_number: 'INV-100201',
    patient_id: 'pat-demo',
    doctor_id: 'doc-priya',
    items: [
      { description: 'Cardiology Consultation', category: 'Consultation', amount: 1200 },
      { description: 'ECG Diagnostic Test', category: 'Lab Test', amount: 800 },
      { description: 'ICU Bed Allocation (1 Day)', category: 'Room', amount: 5500 },
    ],
    subtotal: 7500,
    tax: 375,
    discount: 375,
    total_amount: 7500,
    payment_status: 'Paid',
    payment_method: 'Card',
    created_at: subDays(new Date(), 2).toISOString(),
  },
  {
    id: 'inv-2',
    invoice_number: 'INV-100202',
    patient_id: 'pat-2',
    doctor_id: 'doc-ananya',
    items: [
      { description: 'Dermatology Consultation', category: 'Consultation', amount: 1000 },
      { description: 'Eczema Topical Ointment', category: 'Pharmacy', amount: 650 },
    ],
    subtotal: 1650,
    tax: 82.5,
    discount: 0,
    total_amount: 1732.5,
    payment_status: 'Pending',
    payment_method: 'Unpaid',
    created_at: subDays(new Date(), 1).toISOString(),
  },
];

const defaultAudit = [
  { id: 'aud-1', action: 'SYSTEM_BOOT', user_name: 'MedVault Local Engine', user_role: 'system', details: 'Local database storage initialized', category: 'SYSTEM', createdAt: new Date().toISOString() },
];

// Initialize Database
export const initLocalStorageDb = () => {
  if (!localStorage.getItem(KEYS.USERS)) {
    const allUsers = [...defaultDoctors, ...defaultPatients, ...defaultAdmins];
    localStorage.setItem(KEYS.USERS, JSON.stringify(allUsers));
  }
  if (!localStorage.getItem(KEYS.APPOINTMENTS)) {
    localStorage.setItem(KEYS.APPOINTMENTS, JSON.stringify(generateAppointments()));
  }
  if (!localStorage.getItem(KEYS.RECORDS)) {
    localStorage.setItem(KEYS.RECORDS, JSON.stringify(defaultRecords));
  }
  if (!localStorage.getItem(KEYS.BEDS)) {
    localStorage.setItem(KEYS.BEDS, JSON.stringify(defaultBeds));
  }
  if (!localStorage.getItem(KEYS.PHARMACY)) {
    localStorage.setItem(KEYS.PHARMACY, JSON.stringify(defaultPharmacy));
  }
  if (!localStorage.getItem(KEYS.BILLING)) {
    localStorage.setItem(KEYS.BILLING, JSON.stringify(defaultBilling));
  }
  if (!localStorage.getItem(KEYS.AUDIT)) {
    localStorage.setItem(KEYS.AUDIT, JSON.stringify(defaultAudit));
  }
  if (!localStorage.getItem(KEYS.AVAILABILITY)) {
    const availability = [];
    defaultDoctors.forEach(doc => {
      for (let i = 1; i <= 5; i++) {
        availability.push({
          id: uuid(),
          doctor_id: doc.id,
          day_of_week: i,
          start_time: '09:00',
          end_time: '17:00',
          slot_duration_minutes: 30,
        });
      }
    });
    localStorage.setItem(KEYS.AVAILABILITY, JSON.stringify(availability));
  }
};

const getList = (key) => JSON.parse(localStorage.getItem(key) || '[]');
const saveList = (key, data) => localStorage.setItem(key, JSON.stringify(data));

// AUTH API
export const mockAuth = {
  getSession: () => {
    initLocalStorageDb();
    const sessionUser = JSON.parse(localStorage.getItem(KEYS.SESSION) || 'null');
    return { data: { session: sessionUser ? { user: sessionUser } : null } };
  },

  signIn: (email, password) => {
    initLocalStorageDb();
    const users = getList(KEYS.USERS);
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!user) throw new Error('User not found.');
    localStorage.setItem(KEYS.SESSION, JSON.stringify(user));
    return { user };
  },

  signUp: (email, password, profileData) => {
    initLocalStorageDb();
    const users = getList(KEYS.USERS);
    if (users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
      throw new Error('Email already registered.');
    }

    const newUser = {
      id: uuid(),
      email,
      ...profileData,
      created_at: new Date().toISOString(),
    };

    users.push(newUser);
    saveList(KEYS.USERS, users);
    localStorage.setItem(KEYS.SESSION, JSON.stringify(newUser));
    return { user: newUser };
  },

  signOut: () => {
    localStorage.removeItem(KEYS.SESSION);
  },

  getProfile: (userId) => {
    const users = getList(KEYS.USERS);
    return users.find(u => u.id === userId) || null;
  }
};

// DATA API
export const mockDb = {
  getDoctors: () => {
    initLocalStorageDb();
    return getList(KEYS.USERS).filter(u => u.role === 'doctor');
  },

  getAppointments: (userId, role) => {
    initLocalStorageDb();
    const appts = getList(KEYS.APPOINTMENTS);
    const users = getList(KEYS.USERS);

    return appts
      .filter(a => role === 'doctor' ? a.doctor_id === userId : a.patient_id === userId)
      .map(a => ({
        ...a,
        patient: users.find(u => u.id === a.patient_id || u._id === a.patient_id),
        doctor: users.find(u => u.id === a.doctor_id || u._id === a.doctor_id),
      }));
  },

  getMedicalRecords: (patientId) => {
    initLocalStorageDb();
    const records = getList(KEYS.RECORDS);
    const users = getList(KEYS.USERS);

    return records
      .filter(r => r.patient_id === patientId)
      .map(r => ({
        ...r,
        doctor: users.find(u => u.id === r.doctor_id || u._id === r.doctor_id),
        patient: users.find(u => u.id === r.patient_id || u._id === r.patient_id),
      }));
  },

  createAppointment: (apptData) => {
    const appts = getList(KEYS.APPOINTMENTS);
    const newAppt = {
      id: uuid(),
      ...apptData,
      created_at: new Date().toISOString(),
    };
    appts.push(newAppt);
    saveList(KEYS.APPOINTMENTS, appts);
    return newAppt;
  },

  updateAppointmentStatus: (apptId, status) => {
    const appts = getList(KEYS.APPOINTMENTS);
    const updated = appts.map(a => (a.id === apptId || a._id === apptId) ? { ...a, status } : a);
    saveList(KEYS.APPOINTMENTS, updated);
  },

  createMedicalRecord: (recordData) => {
    const records = getList(KEYS.RECORDS);
    const newRec = {
      id: uuid(),
      ...recordData,
      created_at: new Date().toISOString(),
    };
    records.push(newRec);
    saveList(KEYS.RECORDS, records);
    return newRec;
  },

  // Bed API
  getBeds: () => {
    initLocalStorageDb();
    const beds = getList(KEYS.BEDS);
    const users = getList(KEYS.USERS);

    const populatedBeds = beds.map(b => ({
      ...b,
      patient_id: users.find(u => u.id === b.patient_id || u._id === b.patient_id) || null,
    }));

    const total = beds.length;
    const occupied = beds.filter(b => b.status === 'Occupied').length;
    const available = beds.filter(b => b.status === 'Available').length;

    return {
      beds: populatedBeds,
      stats: { total, occupied, available, occupancy_rate: total > 0 ? Math.round((occupied / total) * 100) : 0 }
    };
  },

  updateBed: (bedId, status, patientId, notes) => {
    const beds = getList(KEYS.BEDS);
    const updated = beds.map(b => {
      if (b.id === bedId || b._id === bedId) {
        return {
          ...b,
          status: status !== undefined ? status : b.status,
          patient_id: patientId !== undefined ? patientId : b.patient_id,
          notes: notes !== undefined ? notes : b.notes,
        };
      }
      return b;
    });
    saveList(KEYS.BEDS, updated);
    return mockDb.getBeds();
  },

  // Billing API
  getBilling: (patientId) => {
    initLocalStorageDb();
    const invoices = getList(KEYS.BILLING);
    const users = getList(KEYS.USERS);

    const filtered = patientId ? invoices.filter(i => i.patient_id === patientId) : invoices;
    const populated = filtered.map(i => ({
      ...i,
      patient_id: users.find(u => u.id === i.patient_id || u._id === i.patient_id),
      doctor_id: users.find(u => u.id === i.doctor_id || u._id === i.doctor_id),
    }));

    const totalRevenue = populated.filter(i => i.payment_status === 'Paid').reduce((sum, i) => sum + (i.total_amount || 0), 0);
    const pendingAmount = populated.filter(i => i.payment_status === 'Pending').reduce((sum, i) => sum + (i.total_amount || 0), 0);

    return {
      invoices: populated,
      stats: { total_invoices: populated.length, total_revenue: totalRevenue, pending_amount: pendingAmount }
    };
  },

  createBilling: (data) => {
    const invoices = getList(KEYS.BILLING);
    const subtotal = data.items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    const total_amount = Math.max(0, subtotal + (Number(data.tax) || 0) - (Number(data.discount) || 0));

    const newInv = {
      id: uuid(),
      invoice_number: `INV-${Date.now().toString().slice(-6)}`,
      patient_id: data.patient_id,
      doctor_id: data.doctor_id || null,
      items: data.items,
      subtotal,
      tax: Number(data.tax) || 0,
      discount: Number(data.discount) || 0,
      total_amount,
      payment_status: 'Pending',
      payment_method: 'Unpaid',
      created_at: new Date().toISOString(),
    };

    invoices.unshift(newInv);
    saveList(KEYS.BILLING, invoices);
    return newInv;
  },

  payBilling: (invoiceId, paymentMethod) => {
    const invoices = getList(KEYS.BILLING);
    const updated = invoices.map(i => {
      if (i.id === invoiceId || i._id === invoiceId) {
        return { ...i, payment_status: 'Paid', payment_method: paymentMethod, paid_at: new Date().toISOString() };
      }
      return i;
    });
    saveList(KEYS.BILLING, updated);
  },

  // Pharmacy API
  getPharmacy: () => {
    initLocalStorageDb();
    const items = getList(KEYS.PHARMACY);
    const lowStockCount = items.filter(i => i.stock_quantity <= i.reorder_level).length;
    return { items, stats: { total_medicines: items.length, low_stock_alerts: lowStockCount } };
  },

  addPharmacyStock: (itemData) => {
    const items = getList(KEYS.PHARMACY);
    const newItem = { id: uuid(), ...itemData, stock_quantity: Number(itemData.stock_quantity) || 0, unit_price: Number(itemData.unit_price) || 0 };
    items.unshift(newItem);
    saveList(KEYS.PHARMACY, items);
    return newItem;
  },

  updatePharmacyStock: (itemId, change) => {
    const items = getList(KEYS.PHARMACY);
    const updated = items.map(i => {
      if (i.id === itemId || i._id === itemId) {
        return { ...i, stock_quantity: Math.max(0, i.stock_quantity + Number(change)) };
      }
      return i;
    });
    saveList(KEYS.PHARMACY, updated);
  },

  // Audit API
  getAuditLogs: () => {
    initLocalStorageDb();
    return getList(KEYS.AUDIT);
  },

  // Admin Overview
  getAllAppointments: () => {
    initLocalStorageDb();
    const appts = getList(KEYS.APPOINTMENTS);
    const users = getList(KEYS.USERS);
    return appts.map(a => ({
      ...a,
      patient: users.find(u => u.id === a.patient_id || u._id === a.patient_id),
      doctor: users.find(u => u.id === a.doctor_id || u._id === a.doctor_id),
    }));
  },

  getAllUsers: () => {
    initLocalStorageDb();
    return getList(KEYS.USERS);
  }
};
