const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const fs = require('fs');
const path = require('path');

// In-Memory Firestore Collection Mock Class for zero-crash fallback
class InMemoryCollection {
  constructor(name) {
    this.name = name;
    this.data = new Map();
  }

  doc(id) {
    const docId = id || 'doc_' + Math.random().toString(36).substr(2, 9);
    return {
      id: docId,
      get: async () => {
        const item = this.data.get(docId);
        return {
          exists: !!item,
          id: docId,
          data: () => item || null,
        };
      },
      set: async (val, options) => {
        const existing = options && options.merge ? (this.data.get(docId) || {}) : {};
        const updated = { ...existing, ...val, id: docId, _id: docId };
        this.data.set(docId, updated);
        return updated;
      },
      update: async (val) => {
        const existing = this.data.get(docId) || {};
        const updated = { ...existing, ...val, id: docId, _id: docId };
        this.data.set(docId, updated);
        return updated;
      },
      delete: async () => {
        this.data.delete(docId);
        return true;
      },
    };
  }

  async add(val) {
    const docId = 'doc_' + Math.random().toString(36).substr(2, 9);
    const item = { ...val, id: docId, _id: docId, created_at: val.created_at || new Date().toISOString() };
    this.data.set(docId, item);
    return { id: docId, get: async () => ({ exists: true, id: docId, data: () => item }) };
  }

  async get() {
    const docs = Array.from(this.data.values()).map((item) => ({
      id: item.id || item._id,
      exists: true,
      data: () => item,
    }));
    return {
      empty: docs.length === 0,
      size: docs.length,
      docs,
      forEach: (cb) => docs.forEach(cb),
    };
  }

  where(field, op, value) {
    const filtered = new InMemoryCollection(this.name);
    this.data.forEach((item, id) => {
      const itemVal = item[field];
      let match = false;
      if (op === '==' && itemVal === value) match = true;
      if (op === '!=' && itemVal !== value) match = true;
      if (op === '>=' && itemVal >= value) match = true;
      if (op === '<=' && itemVal <= value) match = true;
      if (op === 'in' && Array.isArray(value) && value.includes(itemVal)) match = true;
      if (match) filtered.data.set(id, item);
    });
    return filtered;
  }

  orderBy(field, direction = 'asc') {
    const sorted = new InMemoryCollection(this.name);
    const items = Array.from(this.data.entries());
    items.sort((a, b) => {
      const valA = a[1][field] || '';
      const valB = b[1][field] || '';
      if (direction === 'desc') return valB > valA ? 1 : valB < valA ? -1 : 0;
      return valA > valB ? 1 : valA < valB ? -1 : 0;
    });
    items.forEach(([id, item]) => sorted.data.set(id, item));
    return sorted;
  }

  limit(count) {
    const limited = new InMemoryCollection(this.name);
    const items = Array.from(this.data.entries()).slice(0, count);
    items.forEach(([id, item]) => limited.data.set(id, item));
    return limited;
  }
}

class InMemoryDb {
  constructor() {
    this.collections = new Map();
  }

  collection(name) {
    if (!this.collections.has(name)) {
      this.collections.set(name, new InMemoryCollection(name));
    }
    return this.collections.get(name);
  }
}

let db;
let isRealFirebase = false;

try {
  let serviceAccount = null;

  // 1. Search local workspace directories for service account JSON file (for local dev)
  const searchDirs = [__dirname, process.cwd(), path.join(process.cwd(), 'api'), path.join(__dirname, '..')];
  for (const dir of searchDirs) {
    if (fs.existsSync(dir)) {
      try {
        const files = fs.readdirSync(dir);
        const jsonFile = files.find(f => f.endsWith('.json') && (f.includes('firebase-adminsdk') || f.includes('adminsdk')));
        if (jsonFile) {
          const fullPath = path.join(dir, jsonFile);
          serviceAccount = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
          break;
        }
      } catch (dirErr) {
        // Ignore read errors
      }
    }
  }

  // 3. Fallback to FIREBASE_SERVICE_ACCOUNT environment variable (JSON string)
  if (!serviceAccount && process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
      serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    } catch (e) {
      console.warn('Failed to parse FIREBASE_SERVICE_ACCOUNT env var JSON');
    }
  }

  // 4. Fallback to FIREBASE_SERVICE_ACCOUNT_BASE64 environment variable
  if (!serviceAccount && process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
    try {
      const decoded = Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, 'base64').toString('utf8');
      serviceAccount = JSON.parse(decoded);
    } catch (e) {
      console.warn('Failed to parse FIREBASE_SERVICE_ACCOUNT_BASE64 env var');
    }
  }

  // 5. Fallback to individual env variables if valid (not default placeholder)
  if (!serviceAccount &&
      process.env.FIREBASE_PROJECT_ID &&
      process.env.FIREBASE_PROJECT_ID !== 'your-project-id' &&
      process.env.FIREBASE_CLIENT_EMAIL &&
      process.env.FIREBASE_PRIVATE_KEY) {
    serviceAccount = {
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n').replace(/^"|"$/g, ''),
    };
  }

  if (serviceAccount && (serviceAccount.project_id || serviceAccount.projectId)) {
    const apps = getApps();
    if (!apps.length) {
      initializeApp({
        credential: cert(serviceAccount),
      });
    }
    db = getFirestore();
    try {
      db.settings({ ignoreUndefinedProperties: true });
    } catch (e) {
      // Ignore if settings already initialized
    }
    isRealFirebase = true;
    console.log(`🔥 Connected to Live Firebase Firestore (Project: ${serviceAccount.project_id || serviceAccount.projectId})`);
  } else {
    db = new InMemoryDb();
    console.log('🟢 Running in-memory Firestore Fallback simulator (Ready for Firebase credentials)');
  }
} catch (err) {
  console.warn('⚠️ Firebase Admin initialization warning:', err.message);
  db = new InMemoryDb();
}

module.exports = { db, isRealFirebase };

