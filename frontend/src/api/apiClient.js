import { mockAuth, mockDb } from './localStorageDb';

let activeApiBase = '/api';
let backendOnline = false;

export const getApiBase = () => activeApiBase;

export const checkBackendStatus = async () => {
  const candidateBases = ['/api'];

  if (process.env.REACT_APP_API_URL) {
    const customUrl = process.env.REACT_APP_API_URL.replace(/\/+$/, '');
    if (!candidateBases.includes(customUrl)) candidateBases.unshift(customUrl);
  }

  if (typeof window !== 'undefined') {
    const originApi = `${window.location.origin}/api`;
    if (!candidateBases.includes(originApi)) candidateBases.push(originApi);

    if (window.location.hostname && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      candidateBases.push(`${window.location.protocol}//${window.location.hostname}:5000/api`);
      candidateBases.push(`${window.location.protocol}//${window.location.hostname}:5001/api`);
    }
  }

  ['http://localhost:5000/api', 'http://localhost:5001/api', 'http://localhost:5002/api', 'http://localhost:5003/api'].forEach(url => {
    if (!candidateBases.includes(url)) candidateBases.push(url);
  });

  // Check /api/health endpoint
  for (const baseUrl of candidateBases) {
    try {
      const res = await fetch(`${baseUrl}/health`, { signal: AbortSignal.timeout(3500) });
      if (res.ok) {
        const data = await res.json();
        if (data.status === 'ok' || data.status === 'healthy' || data.healthy === true) {
          activeApiBase = baseUrl;
          backendOnline = true;
          return true;
        }
      }
    } catch (err) {
      // Continue checking candidate URLs
    }
  }

  // Secondary check on root /api base
  for (const baseUrl of candidateBases) {
    try {
      const res = await fetch(baseUrl, { signal: AbortSignal.timeout(3500) });
      if (res.ok) {
        const data = await res.json();
        if (data.message || data.status === 'ok' || data.healthy === true) {
          activeApiBase = baseUrl;
          backendOnline = true;
          return true;
        }
      }
    } catch (err) {
      // Ignore
    }
  }

  backendOnline = false;
  return false;
};

// Check immediately on load
checkBackendStatus();

// Helper to get auth header
const getHeaders = () => {
  const token = localStorage.getItem('medcare_jwt');
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
};

export const apiClient = {
  isBackendConnected: () => backendOnline,

  // Auth endpoints
  login: async (email, password) => {
    const isOnline = await checkBackendStatus();
    if (!isOnline) {
      const res = mockAuth.signIn(email, password);
      return { user: res.user, token: 'mock-jwt-token' };
    }

    const res = await fetch(`${getApiBase()}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || 'Login failed');
    }
    const data = await res.json();
    localStorage.setItem('medcare_jwt', data.token);
    return data;
  },

  register: async (email, password, profileData) => {
    const isOnline = await checkBackendStatus();
    if (!isOnline) {
      const res = mockAuth.signUp(email, password, profileData);
      return { user: res.user, token: 'mock-jwt-token' };
    }

    const res = await fetch(`${getApiBase()}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, ...profileData })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || 'Registration failed');
    }
    const data = await res.json();
    localStorage.setItem('medcare_jwt', data.token);
    return data;
  },

  logout: () => {
    localStorage.removeItem('medcare_jwt');
    mockAuth.signOut();
  },

  getProfile: async () => {
    const isOnline = await checkBackendStatus();
    if (!isOnline) {
      const res = mockAuth.getSession();
      return res.data?.session?.user || null;
    }

    try {
      const res = await fetch(`${getApiBase()}/auth/me`, {
        headers: getHeaders()
      });
      if (!res.ok) {
        localStorage.removeItem('medcare_jwt');
        return null;
      }
      const data = await res.json();
      return data.user;
    } catch (err) {
      return null;
    }
  },

  getDoctors: async () => {
    const isOnline = await checkBackendStatus();
    if (!isOnline) {
      const list = mockDb.getDoctors();
      return list.map(d => ({ ...d, id: d.id || d._id }));
    }

    const res = await fetch(`${getApiBase()}/auth/doctors`, {
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Failed to fetch doctors list');
    const data = await res.json();
    return data.map(d => ({ ...d, id: d._id || d.id }));
  },

  getUsers: async () => {
    const isOnline = await checkBackendStatus();
    if (!isOnline) {
      const list = mockDb.getAllUsers();
      return list.map(u => ({ ...u, id: u.id || u._id }));
    }

    const res = await fetch(`${getApiBase()}/auth/users`, {
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Failed to fetch users list');
    const data = await res.json();
    return data.map(u => ({ ...u, id: u._id || u.id }));
  },

  // Appointments endpoints
  getAppointments: async (userId, role) => {
    const isOnline = await checkBackendStatus();
    if (!isOnline) {
      return mockDb.getAppointments(userId, role);
    }

    const res = await fetch(`${getApiBase()}/appointments`, {
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Failed to fetch appointments');
    return res.json();
  },

  createAppointment: async (apptData) => {
    const isOnline = await checkBackendStatus();
    if (!isOnline) {
      return mockDb.createAppointment(apptData);
    }

    const res = await fetch(`${getApiBase()}/appointments`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(apptData)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || 'Failed to book appointment');
    }
    return res.json();
  },

  updateAppointmentStatus: async (apptId, status, notes = '') => {
    const isOnline = await checkBackendStatus();
    if (!isOnline) {
      return mockDb.updateAppointmentStatus(apptId, status);
    }

    const res = await fetch(`${getApiBase()}/appointments/${apptId}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ status, notes })
    });
    if (!res.ok) throw new Error('Failed to update appointment');
    return res.json();
  },

  // Medical Records endpoints
  getMedicalRecords: async (patientId) => {
    const isOnline = await checkBackendStatus();
    if (!isOnline) {
      return mockDb.getMedicalRecords(patientId);
    }

    const res = await fetch(`${getApiBase()}/records`, {
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Failed to fetch medical records');
    return res.json();
  },

  createMedicalRecord: async (recordData) => {
    const isOnline = await checkBackendStatus();
    if (!isOnline) {
      mockDb.createMedicalRecord(recordData);
      mockDb.updateAppointmentStatus(recordData.appointment_id, 'completed');
      return;
    }

    const res = await fetch(`${getApiBase()}/records`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(recordData)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || 'Failed to create medical record');
    }
    return res.json();
  },

  // Beds API
  getBeds: async () => {
    const isOnline = await checkBackendStatus();
    if (!isOnline) {
      return mockDb.getBeds();
    }

    const res = await fetch(`${getApiBase()}/beds`, {
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Failed to fetch bed allocations');
    return res.json();
  },

  updateBedStatus: async (bedId, status, patientId, notes) => {
    const isOnline = await checkBackendStatus();
    if (!isOnline) {
      return mockDb.updateBed(bedId, status, patientId, notes);
    }

    const res = await fetch(`${getApiBase()}/beds/${bedId}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ status, patient_id: patientId, notes })
    });
    if (!res.ok) throw new Error('Failed to update bed allocation');
    return res.json();
  },

  // Billing API
  getInvoices: async (patientId = null, status = null) => {
    const isOnline = await checkBackendStatus();
    if (!isOnline) {
      return mockDb.getBilling(patientId);
    }

    let query = '';
    const params = [];
    if (patientId) params.push(`patient_id=${patientId}`);
    if (status) params.push(`status=${status}`);
    if (params.length) query = `?${params.join('&')}`;

    const res = await fetch(`${getApiBase()}/billing${query}`, {
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Failed to fetch invoices');
    return res.json();
  },

  createInvoice: async (invoiceData) => {
    const isOnline = await checkBackendStatus();
    if (!isOnline) {
      return mockDb.createBilling(invoiceData);
    }

    const res = await fetch(`${getApiBase()}/billing`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(invoiceData)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || 'Failed to create invoice');
    }
    return res.json();
  },

  payInvoice: async (invoiceId, paymentMethod) => {
    const isOnline = await checkBackendStatus();
    if (!isOnline) {
      return mockDb.payBilling(invoiceId, paymentMethod);
    }

    const res = await fetch(`${getApiBase()}/billing/${invoiceId}/pay`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify({ payment_method: paymentMethod })
    });
    if (!res.ok) throw new Error('Failed to process invoice payment');
    return res.json();
  },

  // Pharmacy API
  getPharmacyInventory: async () => {
    const isOnline = await checkBackendStatus();
    if (!isOnline) {
      return mockDb.getPharmacy();
    }

    const res = await fetch(`${getApiBase()}/pharmacy`, {
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Failed to fetch pharmacy inventory');
    return res.json();
  },

  addMedicine: async (itemData) => {
    const isOnline = await checkBackendStatus();
    if (!isOnline) {
      return mockDb.addPharmacyStock(itemData);
    }

    const res = await fetch(`${getApiBase()}/pharmacy`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(itemData)
    });
    if (!res.ok) throw new Error('Failed to add medicine');
    return res.json();
  },

  updateMedicineStock: async (itemId, change) => {
    const isOnline = await checkBackendStatus();
    if (!isOnline) {
      return mockDb.updatePharmacyStock(itemId, change);
    }

    const res = await fetch(`${getApiBase()}/pharmacy/${itemId}/stock`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ quantity_change: change })
    });
    if (!res.ok) throw new Error('Failed to adjust stock level');
    return res.json();
  },

  // Audit Logs
  getAuditLogs: async () => {
    const isOnline = await checkBackendStatus();
    if (!isOnline) {
      return mockDb.getAuditLogs();
    }

    const res = await fetch(`${getApiBase()}/audit`, {
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Failed to fetch audit logs');
    return res.json();
  },

  // Availability endpoints
  getAvailability: async (doctorId) => {
    const isOnline = await checkBackendStatus();
    if (!isOnline) {
      return mockDb.getAvailability(doctorId);
    }

    const res = await fetch(`${getApiBase()}/availability/${doctorId}`, {
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Failed to fetch availability');
    return res.json();
  },

  updateAvailability: async (doctorId, availabilityData) => {
    const isOnline = await checkBackendStatus();
    if (!isOnline) {
      return mockDb.updateAvailability(doctorId, availabilityData);
    }

    const res = await fetch(`${getApiBase()}/availability`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ availability: availabilityData })
    });
    if (!res.ok) throw new Error('Failed to update availability');
    return res.json();
  }
};
