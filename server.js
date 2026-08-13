const express = require('express');
const cors = require('cors');
const detectPort = require('detect-port');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const { db } = require('./firebase');

const authRoutes = require('./routes/auth');
const appointmentRoutes = require('./routes/appointments');
const recordRoutes = require('./routes/records');
const availabilityRoutes = require('./routes/availability');
const bedRoutes = require('./routes/beds');
const billingRoutes = require('./routes/billing');
const pharmacyRoutes = require('./routes/pharmacy');
const auditRoutes = require('./routes/audit');

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors({
  origin: '*',
}));
app.use(express.json());

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/records', recordRoutes);
app.use('/api/availability', availabilityRoutes);
app.use('/api/beds', bedRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/pharmacy', pharmacyRoutes);
app.use('/api/audit', auditRoutes);

// Base route & Health check (Supports Vercel serverless and standalone server)
const { isRealFirebase } = require('./firebase');

app.get(['/api/health', '/health'], (req, res) => {
  res.json({
    status: 'ok',
    healthy: true,
    database: isRealFirebase ? 'Firebase Firestore' : 'In-Memory Fallback',
    timestamp: new Date().toISOString()
  });
});

app.get(['/api', '/'], (req, res) => {
  res.json({
    message: 'MedVault Express API is active (Firebase Firestore backend)',
    status: 'ok',
    healthy: true
  });
});

// Seed Firebase Firestore Database with Demo Data
const seedDatabase = async () => {
  try {
    const defaultPasswordHash = await bcrypt.hash('demo1234', 10);

    const ensureUser = async (email, full_name, role, phone, date_of_birth, gender, specialty) => {
      const snap = await db.collection('users').where('email', '==', email).get();
      if (snap.empty) {
        const id = 'usr_' + role + '_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
        const user = {
          id,
          _id: id,
          email,
          password: defaultPasswordHash,
          full_name,
          role,
          phone: phone || '+91 98765 43210',
          date_of_birth: date_of_birth || '1990-05-15',
          gender: gender || 'Male',
          created_at: new Date().toISOString(),
        };
        if (role === 'doctor') {
          user.specialty = specialty || 'Cardiology';
        }
        await db.collection('users').doc(id).set(user);
        return user;
      } else {
        return { id: snap.docs[0].id, _id: snap.docs[0].id, ...snap.docs[0].data() };
      }
    };

    const pat1 = await ensureUser('patient@demo.com', 'Ravi Kumar', 'patient', '+91 98765 43210', '1988-03-24', 'Male');
    const pat2 = await ensureUser('ananya.sharma@demo.com', 'Ananya Sharma', 'patient', '+91 98123 45678', '1992-07-11', 'Female');
    const pat3 = await ensureUser('vikram.singh@demo.com', 'Vikram Singh', 'patient', '+91 97654 32109', '1980-11-05', 'Male');
    const pat4 = await ensureUser('priya.patel@demo.com', 'Priya Patel', 'patient', '+91 96543 21098', '1995-09-18', 'Female');
    const pat5 = await ensureUser('rahul.verma@demo.com', 'Rahul Verma', 'patient', '+91 95432 10987', '1985-01-30', 'Male');
    const pat6 = await ensureUser('sneha.reddy@demo.com', 'Sneha Reddy', 'patient', '+91 94321 09876', '1998-12-14', 'Female');

    const docSarah = await ensureUser('doctor@demo.com', 'Dr. Sarah Jenkins', 'doctor', '+91 98989 89898', '1982-08-12', 'Female', 'Cardiology');
    const docRajesh = await ensureUser('dr.rajesh@demo.com', 'Dr. Rajesh Gupta', 'doctor', '+91 97979 79797', '1975-04-20', 'Male', 'Dermatology');
    const docAnita = await ensureUser('dr.anita@demo.com', 'Dr. Anita Roy', 'doctor', '+91 96969 69696', '1980-06-15', 'Female', 'Neurology');
    const docSunita = await ensureUser('dr.sunita@demo.com', 'Dr. Sunita Kapoor', 'doctor', '+91 95959 59595', '1978-09-25', 'Female', 'Orthopedics');
    const docKaran = await ensureUser('dr.karan@demo.com', 'Dr. Karan Mehra', 'doctor', '+91 94949 49494', '1984-11-02', 'Male', 'Pulmonology');

    await ensureUser('admin@demo.com', 'Admin User', 'admin', '+91 90000 00000', '1985-01-01', 'Other');

    // Seed Beds if empty
    const bedsSnap = await db.collection('beds').get();
    if (bedsSnap.empty) {
      const beds = [
        { bed_number: 'ICU-101', ward: 'ICU Ward', room_number: 'Room 101', daily_rate: 3500, status: 'Occupied', patient_id: pat1._id },
        { bed_number: 'ICU-102', ward: 'ICU Ward', room_number: 'Room 102', daily_rate: 3500, status: 'Available' },
        { bed_number: 'GEN-201', ward: 'General Ward', room_number: 'Room 201', daily_rate: 1200, status: 'Occupied', patient_id: pat2._id },
        { bed_number: 'GEN-202', ward: 'General Ward', room_number: 'Room 201', daily_rate: 1200, status: 'Available' },
        { bed_number: 'GEN-203', ward: 'General Ward', room_number: 'Room 202', daily_rate: 1200, status: 'Cleaning' },
        { bed_number: 'VIP-301', ward: 'VIP Suite', room_number: 'Suite 301', daily_rate: 8000, status: 'Occupied', patient_id: pat4._id },
        { bed_number: 'VIP-302', ward: 'VIP Suite', room_number: 'Suite 302', daily_rate: 8000, status: 'Available' },
      ];
      for (const b of beds) {
        const id = 'bed_' + b.bed_number.toLowerCase().replace('-', '_');
        await db.collection('beds').doc(id).set({ id, _id: id, ...b });
      }
    }

    // Seed Pharmacy if empty
    const pharmSnap = await db.collection('pharmacy').get();
    if (pharmSnap.empty) {
      const meds = [
        { name: 'Paracetamol 650mg', generic_name: 'Acetaminophen', category: 'Analgesic', stock_quantity: 450, reorder_level: 50, unit_price: 15, location: 'Shelf A-1' },
        { name: 'Amoxicillin 500mg', generic_name: 'Amoxicillin', category: 'Antibiotic', stock_quantity: 12, reorder_level: 30, unit_price: 45, location: 'Shelf B-3' },
        { name: 'Metformin 500mg', generic_name: 'Metformin', category: 'Antidiabetic', stock_quantity: 280, reorder_level: 40, unit_price: 25, location: 'Shelf C-2' },
        { name: 'Atorvastatin 10mg', generic_name: 'Atorvastatin', category: 'Cardiovascular', stock_quantity: 8, reorder_level: 25, unit_price: 85, location: 'Shelf A-4' },
        { name: 'Cetirizine 10mg', generic_name: 'Cetirizine', category: 'Antihistamine', stock_quantity: 150, reorder_level: 30, unit_price: 10, location: 'Shelf D-1' },
      ];
      for (const m of meds) {
        const id = 'med_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
        await db.collection('pharmacy').doc(id).set({ id, _id: id, ...m, expiry_date: new Date(Date.now() + 365 * 86400000).toISOString() });
      }
    }

    console.log('✅ Live Firebase Firestore Seeding Completed Successfully!');
    console.log('   Available Logins (Password: demo1234):');
    console.log('   --- PATIENTS ---');
    console.log('   - patient@demo.com (Ravi Kumar)');
    console.log('   - ananya.sharma@demo.com (Ananya Sharma)');
    console.log('   - vikram.singh@demo.com (Vikram Singh)');
    console.log('   - priya.patel@demo.com (Priya Patel)');
    console.log('   - rahul.verma@demo.com (Rahul Verma)');
    console.log('   - sneha.reddy@demo.com (Sneha Reddy)');
    console.log('   --- DOCTORS ---');
    console.log('   - doctor@demo.com  (Dr. Sarah Jenkins - Cardiology)');
    console.log('   - dr.rajesh@demo.com (Dr. Rajesh Gupta - Dermatology)');
    console.log('   - dr.anita@demo.com (Dr. Anita Roy - Neurology)');
    console.log('   - dr.sunita@demo.com (Dr. Sunita Kapoor - Orthopedics)');
    console.log('   - dr.karan@demo.com (Dr. Karan Mehra - Pulmonology)');
    console.log('   --- ADMIN ---');
    console.log('   - admin@demo.com   (Admin User)');
  } catch (err) {
    console.error('❌ Database seeding error:', err.message);
  }
};

// Global Error Handler Middleware
app.use((err, req, res, next) => {
  console.error('❌ Express Global Error:', err);
  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? err : undefined,
  });
});

const startServer = async () => {
  await seedDatabase();

  let chosenPort = Number(PORT);
  if (typeof detectPort === 'function') {
    try {
      const freePort = await detectPort(chosenPort);
      if (Number(freePort) !== Number(chosenPort)) {
        chosenPort = freePort;
      }
    } catch (e) {
      // Ignore
    }
  }

  app.listen(chosenPort, () => {
    console.log(`🚀 MedVault Express API Server (Firebase Backend) is live at http://localhost:${chosenPort}`);
  });
};

if (require.main === module) {
  startServer();
} else {
  // Trigger background seed check when imported in serverless function
  seedDatabase().catch((err) => console.warn('Background seed notice:', err.message));
}

module.exports = app;
