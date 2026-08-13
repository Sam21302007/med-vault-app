const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const detectPort = require('detect-port');
const { format } = require('date-fns');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const appointmentRoutes = require('./routes/appointments');
const recordRoutes = require('./routes/records');
const availabilityRoutes = require('./routes/availability');
const bedRoutes = require('./routes/beds');
const billingRoutes = require('./routes/billing');
const pharmacyRoutes = require('./routes/pharmacy');
const auditRoutes = require('./routes/audit');

const User = require('./models/User');
const Appointment = require('./models/Appointment');
const Availability = require('./models/Availability');
const MedicalRecord = require('./models/MedicalRecord');
const Bed = require('./models/Bed');
const Billing = require('./models/Billing');
const Pharmacy = require('./models/Pharmacy');
const AuditLog = require('./models/AuditLog');

const app = express();
const PORT = process.env.PORT || 5001;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/medcare';

// Middleware
app.use(cors({
  origin: '*', // Allow Vercel frontend to connect
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

app.get('/api/health', (req, res) => {
  const dbState = mongoose.connection.readyState;
  res.json({
    status: 'healthy',
    system: 'MedVault Hospital Information System',
    database: (dbState === 1 || dbState === 2 || mongoose.connection.db) ? 'connected' : 'connecting'
  });
});

// Seed data helper — idempotent: creates missing demo accounts & records every startup
const seedDatabase = async () => {
  try {
    let created = 0;

    const ensurePatient = async (email, full_name, phone, gender, date_of_birth) => {
      let pat = await User.findOne({ email });
      if (!pat) {
        pat = await User.create({
          email,
          password: 'demo1234',
          full_name,
          role: 'patient',
          phone,
          gender,
          date_of_birth,
        });
        created++;
      }
      return pat;
    };

    const ensureDoctor = async (email, full_name, specialty, phone, gender) => {
      let doc = await User.findOne({ email });
      if (!doc) {
        doc = await User.create({
          email,
          password: 'demo1234',
          full_name,
          role: 'doctor',
          phone,
          gender,
          specialty,
        });
        const availInserts = [1, 2, 3, 4, 5].map((day) => ({
          doctor_id: doc._id,
          day_of_week: day,
          start_time: '09:00',
          end_time: '17:00',
          slot_duration_minutes: 30,
        }));
        await Availability.insertMany(availInserts);
        created++;
      }
      return doc;
    };

    console.log('🌱 Checking MedVault demo database...');

    const pat1 = await ensurePatient('patient@demo.com', 'Ravi Kumar', '+91 99887 76655', 'male', '1995-05-15');
    const pat2 = await ensurePatient('anita@demo.com', 'Anita Desai', '+91 99887 76656', 'female', '1992-08-22');
    const pat3 = await ensurePatient('arjun@demo.com', 'Arjun Singh', '+91 99887 76657', 'male', '1988-11-10');
    const pat4 = await ensurePatient('meena@demo.com', 'Meena Patel', '+91 99887 76658', 'female', '1984-04-05');
    const pat5 = await ensurePatient('kavita@demo.com', 'Kavita Reddy', '+91 99887 76659', 'female', '1997-09-18');
    const pat6 = await ensurePatient('sanjay@demo.com', 'Sanjay Joshi', '+91 99887 76660', 'male', '1979-12-01');
    const pat7 = await ensurePatient('deepa@demo.com', 'Deepa Sharma', '+91 99887 76661', 'female', '2001-03-30');
    const pat8 = await ensurePatient('rohit@demo.com', 'Rohit Verma', '+91 99887 76662', 'male', '1990-07-14');

    const docPriya = await ensureDoctor('doctor@demo.com', 'Priya Sharma', 'Cardiologist', '+91 98765 43210', 'female');
    const docAravind = await ensureDoctor('aravind@demo.com', 'Aravind Swamy', 'Neurologist', '+91 98765 43211', 'male');
    const docAnanya = await ensureDoctor('ananya@demo.com', 'Ananya Roy', 'Dermatologist', '+91 98765 43212', 'female');
    const docVikram = await ensureDoctor('vikram@demo.com', 'Vikram Malhotra', 'Pediatrician', '+91 98765 43213', 'male');
    const docSunita = await ensureDoctor('sunita@demo.com', 'Sunita Rao', 'Orthopedic', '+91 98765 43214', 'female');
    const docRajesh = await ensureDoctor('rajesh@demo.com', 'Rajesh Verma', 'Ophthalmologist', '+91 98765 43215', 'male');
    const docMeera = await ensureDoctor('meera@demo.com', 'Meera Nambiar', 'ENT Specialist', '+91 98765 43216', 'female');
    const docKaran = await ensureDoctor('karan@demo.com', 'Karan Kapoor', 'Pulmonologist', '+91 98765 43217', 'male');

    let admin = await User.findOne({ email: 'admin@demo.com' });
    if (!admin) {
      admin = await User.create({
        email: 'admin@demo.com',
        password: 'demo1234',
        full_name: 'Admin User',
        role: 'admin',
      });
      created++;
    }

    // Seed Appointments
    const apptCount = await Appointment.countDocuments();
    if (apptCount === 0) {
      const todayStr = format(new Date(), 'yyyy-MM-dd');
      await Appointment.create([
        { patient_id: pat1._id, doctor_id: docPriya._id, appointment_date: todayStr, time_slot: '09:30', status: 'confirmed', priority: 'urgent', reason: 'Hypertension follow-up & ECG', notes: 'Patient reports high morning blood pressure' },
        { patient_id: pat2._id, doctor_id: docAnanya._id, appointment_date: todayStr, time_slot: '11:00', status: 'confirmed', priority: 'normal', reason: 'Skin allergy rash evaluation', notes: 'Pruritic rash on both arms' },
        { patient_id: pat3._id, doctor_id: docAravind._id, appointment_date: todayStr, time_slot: '14:30', status: 'pending', priority: 'emergency', reason: 'Severe acute migraine attack', notes: 'Photophobia and nausea present' },
        { patient_id: pat4._id, doctor_id: docSunita._id, appointment_date: todayStr, time_slot: '16:00', status: 'confirmed', priority: 'normal', reason: 'Bilateral knee joint pain checkup', notes: 'Knee stiffness upon climbing stairs' },
        { patient_id: pat5._id, doctor_id: docMeera._id, appointment_date: todayStr, time_slot: '10:15', status: 'completed', priority: 'normal', reason: 'Sinus pressure & nasal drip', notes: 'Prescribed Amoxicillin-Clavulanate' },
        { patient_id: pat6._id, doctor_id: docKaran._id, appointment_date: todayStr, time_slot: '12:00', status: 'confirmed', priority: 'urgent', reason: 'Asthma exacerbation check', notes: 'Wheezing on exertion' },
        { patient_id: pat7._id, doctor_id: docVikram._id, appointment_date: todayStr, time_slot: '15:00', status: 'pending', priority: 'normal', reason: 'Routine pediatric checkup', notes: 'Annual growth assessment' },
        { patient_id: pat8._id, doctor_id: docRajesh._id, appointment_date: todayStr, time_slot: '16:45', status: 'confirmed', priority: 'normal', reason: 'Vision test & eyeglass renewal', notes: 'Complains of mild eyestrain' },
      ]);
      console.log('✅ Auto-seeded 8 appointments');
    }

    // Seed Medical Records
    const recCount = await MedicalRecord.countDocuments();
    if (recCount === 0) {
      await MedicalRecord.create([
        {
          patient_id: pat1._id,
          doctor_id: docPriya._id,
          diagnosis: 'Primary Essential Hypertension & Sinus Tachycardia',
          prescription: '1. Amlodipine 5mg - 1 tablet daily\n2. Metoprolol 25mg - 1 tablet twice daily',
          notes: 'Patient reported recurrent morning headaches. BP was 148/92. ECG revealed sinus tachycardia.',
        },
        {
          patient_id: pat2._id,
          doctor_id: docAnanya._id,
          diagnosis: 'Acute Atopic Dermatitis & Contact Eczema',
          prescription: '1. Hydrocortisone Ointment 1% - Apply twice daily\n2. Cetirizine 10mg - 1 tablet at bedtime',
          notes: 'Erythematous pruritic lesions on forearms. Advised fragrance-free soaps and moisturizing lotion.',
        },
        {
          patient_id: pat3._id,
          doctor_id: docAravind._id,
          diagnosis: 'Chronic Migraine without Aura & Cervical Spasm',
          prescription: '1. Rizatriptan 10mg - Take at onset\n2. Naproxen 500mg - Take as needed with food',
          notes: 'Recurrent unilateral throbbing headache with photophobia. Prescribed ergonomic neck exercises.',
        },
        {
          patient_id: pat4._id,
          doctor_id: docSunita._id,
          diagnosis: 'Bilateral Knee Osteoarthritis (Grade II) & Lumbar Strain',
          prescription: '1. Glucosamine Chondroitin 1500mg - 1 daily\n2. Aceclofenac 100mg - Post meals',
          notes: 'Joint stiffness and crepitus upon climbing stairs. Prescribed quadriceps exercises and hot compress.',
        },
        {
          patient_id: pat5._id,
          doctor_id: docMeera._id,
          diagnosis: 'Acute Maxillary Sinusitis & Seasonal Allergic Rhinitis',
          prescription: '1. Amoxicillin-Clavulanate 625mg - Twice daily for 5 days\n2. Fluticasone Nasal Spray - 2 sprays daily',
          notes: 'Facial pain and purulent nasal discharge. Throat showed mild post-nasal drip erythema.',
        },
        {
          patient_id: pat6._id,
          doctor_id: docKaran._id,
          diagnosis: 'Bronchial Asthma Exacerbation',
          prescription: '1. Salbutamol Inhaler - 2 puffs as needed\n2. Budesonide 200mcg - Twice daily',
          notes: 'Shortness of breath and bilateral wheezing. Oxygen saturation 96% on room air.',
        },
      ]);
      console.log('✅ Auto-seeded 6 patient medical records');
    }

    // Seed Hospital Beds
    const bedCount = await Bed.countDocuments();
    if (bedCount === 0) {
      await Bed.create([
        { bed_number: 'ICU-101', ward: 'ICU', room_number: '101', status: 'Occupied', patient_id: pat1._id, daily_rate: 5500, notes: 'Cardiac Monitoring Active' },
        { bed_number: 'ICU-102', ward: 'ICU', room_number: '102', status: 'Available', daily_rate: 5500, notes: 'Ventilator Ready' },
        { bed_number: 'ICU-103', ward: 'ICU', room_number: '103', status: 'Occupied', patient_id: pat6._id, daily_rate: 5500, notes: 'Severe Respiratory Support' },
        { bed_number: 'EMG-201', ward: 'Emergency', room_number: '201', status: 'Occupied', patient_id: pat3._id, daily_rate: 3000, notes: 'Observation Room' },
        { bed_number: 'EMG-202', ward: 'Emergency', room_number: '202', status: 'Cleaning', daily_rate: 3000, notes: 'Disinfected post-discharge' },
        { bed_number: 'EMG-203', ward: 'Emergency', room_number: '203', status: 'Available', daily_rate: 3000, notes: 'Trauma Bay Ready' },
        { bed_number: 'GEN-301', ward: 'General Ward', room_number: '301', status: 'Occupied', patient_id: pat2._id, daily_rate: 1500, notes: 'Dermatology Care' },
        { bed_number: 'GEN-302', ward: 'General Ward', room_number: '302', status: 'Available', daily_rate: 1500, notes: 'Window view bed' },
        { bed_number: 'GEN-303', ward: 'General Ward', room_number: '303', status: 'Available', daily_rate: 1500, notes: 'Standard bed' },
        { bed_number: 'GEN-304', ward: 'General Ward', room_number: '304', status: 'Occupied', patient_id: pat7._id, daily_rate: 1500, notes: 'Post-op observation' },
        { bed_number: 'VIP-401', ward: 'VIP Suite', room_number: '401', status: 'Occupied', patient_id: pat4._id, daily_rate: 8000, notes: 'Orthopedic Recovery' },
        { bed_number: 'VIP-402', ward: 'VIP Suite', room_number: '402', status: 'Available', daily_rate: 8000, notes: 'Luxury Suite' },
        { bed_number: 'PED-501', ward: 'Pediatrics', room_number: '501', status: 'Available', daily_rate: 2200, notes: 'Pediatric Bed' },
        { bed_number: 'PED-502', ward: 'Pediatrics', room_number: '502', status: 'Occupied', patient_id: pat5._id, daily_rate: 2200, notes: 'Under observation' },
        { bed_number: 'PED-503', ward: 'Pediatrics', room_number: '503', status: 'Available', daily_rate: 2200, notes: 'Crib Bed' },
        { bed_number: 'SUR-601', ward: 'Surgical Ward', room_number: '601', status: 'Maintenance', daily_rate: 4000, notes: 'Equipment Check' },
        { bed_number: 'SUR-602', ward: 'Surgical Ward', room_number: '602', status: 'Occupied', patient_id: pat8._id, daily_rate: 4000, notes: 'Post-Appendectomy' },
        { bed_number: 'SUR-603', ward: 'Surgical Ward', room_number: '603', status: 'Available', daily_rate: 4000, notes: 'Pre-op Bed' },
      ]);
      console.log('✅ Auto-seeded 18 hospital beds across wards');
    }

    // Seed Pharmacy Inventory
    const pharmaCount = await Pharmacy.countDocuments();
    if (pharmaCount === 0) {
      await Pharmacy.create([
        { name: 'Paracetamol 650mg', generic_name: 'Acetaminophen', category: 'Painkillers', stock_quantity: 450, reorder_level: 50, unit_price: 15, expiry_date: new Date('2027-12-31'), manufacturer: 'MedVault Labs', location: 'Shelf A-1' },
        { name: 'Amoxicillin 500mg', generic_name: 'Amoxicillin Trihydrate', category: 'Antibiotics', stock_quantity: 120, reorder_level: 30, unit_price: 45, expiry_date: new Date('2026-11-20'), manufacturer: 'Sun Pharma', location: 'Shelf A-2' },
        { name: 'Amlodipine 5mg', generic_name: 'Amlodipine Besylate', category: 'Cardiovascular', stock_quantity: 200, reorder_level: 40, unit_price: 25, expiry_date: new Date('2028-05-15'), manufacturer: 'Cipla Ltd', location: 'Shelf B-1' },
        { name: 'Cetirizine 10mg', generic_name: 'Cetirizine HCl', category: 'Dermatology', stock_quantity: 15, reorder_level: 25, unit_price: 12, expiry_date: new Date('2027-08-10'), manufacturer: 'Dr. Reddys', location: 'Shelf B-3' },
        { name: 'Metoprolol 25mg', generic_name: 'Metoprolol Succinate', category: 'Cardiovascular', stock_quantity: 180, reorder_level: 30, unit_price: 35, expiry_date: new Date('2027-03-30'), manufacturer: 'Zydus', location: 'Shelf B-2' },
        { name: 'Rizatriptan 10mg', generic_name: 'Rizatriptan Benzoate', category: 'Neurology', stock_quantity: 8, reorder_level: 15, unit_price: 85, expiry_date: new Date('2026-09-15'), manufacturer: 'Lupin', location: 'Shelf C-1' },
        { name: 'Glucosamine 1500mg', generic_name: 'Glucosamine Sulfate', category: 'Vitamins & Supplements', stock_quantity: 90, reorder_level: 20, unit_price: 60, expiry_date: new Date('2028-01-01'), manufacturer: 'Himalaya Wellness', location: 'Shelf D-1' },
        { name: 'Hydrocortisone Cream 1%', generic_name: 'Hydrocortisone', category: 'Dermatology', stock_quantity: 55, reorder_level: 15, unit_price: 75, expiry_date: new Date('2027-06-25'), manufacturer: 'Glenmark', location: 'Shelf B-4' },
        { name: 'Salbutamol Inhaler 100mcg', generic_name: 'Albuterol Sulfate', category: 'Respiratory', stock_quantity: 110, reorder_level: 20, unit_price: 180, expiry_date: new Date('2027-10-15'), manufacturer: 'Cipla Ltd', location: 'Shelf E-1' },
        { name: 'Pantoprazole 40mg', generic_name: 'Pantoprazole Sodium', category: 'Gastroenterology', stock_quantity: 320, reorder_level: 40, unit_price: 30, expiry_date: new Date('2028-03-20'), manufacturer: 'Torrent Pharma', location: 'Shelf F-2' },
        { name: 'Metformin 500mg', generic_name: 'Metformin HCl', category: 'Endocrinology', stock_quantity: 500, reorder_level: 50, unit_price: 18, expiry_date: new Date('2028-06-30'), manufacturer: 'USV Ltd', location: 'Shelf G-1' },
        { name: 'Azithromycin 500mg', generic_name: 'Azithromycin Dihydrate', category: 'Antibiotics', stock_quantity: 14, reorder_level: 25, unit_price: 110, expiry_date: new Date('2026-12-10'), manufacturer: 'Alembic', location: 'Shelf A-3' },
        { name: 'Ibuprofen 400mg', generic_name: 'Ibuprofen', category: 'Painkillers', stock_quantity: 260, reorder_level: 30, unit_price: 20, expiry_date: new Date('2027-04-18'), manufacturer: 'Abbott', location: 'Shelf A-4' },
        { name: 'Atorvastatin 10mg', generic_name: 'Atorvastatin Calcium', category: 'Cardiovascular', stock_quantity: 210, reorder_level: 30, unit_price: 40, expiry_date: new Date('2028-02-14'), manufacturer: 'Ranbaxy', location: 'Shelf B-5' },
        { name: 'Ondansetron 4mg', generic_name: 'Ondansetron HCl', category: 'Gastroenterology', stock_quantity: 95, reorder_level: 20, unit_price: 35, expiry_date: new Date('2027-11-05'), manufacturer: 'Mankind', location: 'Shelf F-3' },
        { name: 'Ciprofloxacin 500mg', generic_name: 'Ciprofloxacin', category: 'Antibiotics', stock_quantity: 130, reorder_level: 25, unit_price: 50, expiry_date: new Date('2027-09-12'), manufacturer: 'Cadila', location: 'Shelf A-5' },
      ]);
      console.log('✅ Auto-seeded 16 pharmacy medicines');
    }

    // Seed Hospital Invoices
    const billCount = await Billing.countDocuments();
    if (billCount === 0) {
      await Billing.create([
        {
          invoice_number: 'INV-100201',
          patient_id: pat1._id,
          doctor_id: docPriya._id,
          items: [
            { description: 'Cardiology Consultation', category: 'Consultation', amount: 1200 },
            { description: 'ECG Diagnostic Test', category: 'Lab Test', amount: 800 },
            { description: 'ICU Bed Allocation (1 Day)', category: 'Room', amount: 5500 },
            { description: 'Hypertension Prescription Drugs', category: 'Pharmacy', amount: 450 },
          ],
          subtotal: 7950,
          tax: 397.5,
          discount: 347.5,
          total_amount: 8000,
          payment_status: 'Paid',
          payment_method: 'Card',
          paid_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        },
        {
          invoice_number: 'INV-100202',
          patient_id: pat2._id,
          doctor_id: docAnanya._id,
          items: [
            { description: 'Dermatology Consultation', category: 'Consultation', amount: 1000 },
            { description: 'Skin Allergy Patch Test', category: 'Lab Test', amount: 1500 },
            { description: 'Eczema Topical Ointment & Antihistamines', category: 'Pharmacy', amount: 650 },
          ],
          subtotal: 3150,
          tax: 157.5,
          discount: 0,
          total_amount: 3307.5,
          payment_status: 'Pending',
          payment_method: 'Unpaid',
        },
        {
          invoice_number: 'INV-100203',
          patient_id: pat3._id,
          doctor_id: docAravind._id,
          items: [
            { description: 'Neurology Consultation', category: 'Consultation', amount: 1500 },
            { description: 'Brain MRI Scan', category: 'Lab Test', amount: 7500 },
            { description: 'Emergency Ward Observation', category: 'Room', amount: 3000 },
          ],
          subtotal: 12000,
          tax: 600,
          discount: 600,
          total_amount: 12000,
          payment_status: 'Paid',
          payment_method: 'Insurance',
          paid_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        },
        {
          invoice_number: 'INV-100204',
          patient_id: pat4._id,
          doctor_id: docSunita._id,
          items: [
            { description: 'Orthopedic Consultation', category: 'Consultation', amount: 1100 },
            { description: 'Knee X-Ray Bilateral', category: 'Lab Test', amount: 1800 },
            { description: 'VIP Suite Stay (2 Days)', category: 'Room', amount: 16000 },
          ],
          subtotal: 18900,
          tax: 945,
          discount: 845,
          total_amount: 19000,
          payment_status: 'Paid',
          payment_method: 'UPI',
          paid_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        },
        {
          invoice_number: 'INV-100205',
          patient_id: pat6._id,
          doctor_id: docKaran._id,
          items: [
            { description: 'Pulmonology Consultation', category: 'Consultation', amount: 1300 },
            { description: 'Spirometry Lung Function Test', category: 'Lab Test', amount: 2200 },
            { description: 'Salbutamol Inhaler & Nebulization', category: 'Pharmacy', amount: 550 },
          ],
          subtotal: 4050,
          tax: 202.5,
          discount: 0,
          total_amount: 4252.5,
          payment_status: 'Pending',
          payment_method: 'Unpaid',
        },
      ]);
      console.log('✅ Auto-seeded 5 hospital billing invoices');
    }

    // Seed Audit Log
    const auditCount = await AuditLog.countDocuments();
    if (auditCount === 0) {
      await AuditLog.create([
        { action: 'SYSTEM_BOOT', user_name: 'MedVault Engine', user_role: 'system', details: 'Hospital Database Management System initialized', category: 'SYSTEM' },
        { action: 'DATABASE_SEEDED', user_name: 'AutoSeeder', user_role: 'system', details: 'Populated demo records for patients, doctors, appointments, beds, pharmacy, and billing', category: 'SYSTEM' },
        { action: 'BED_ASSIGNED', user_name: 'Admin User', user_role: 'admin', details: 'Assigned Bed ICU-101 to Patient Ravi Kumar', category: 'BED' },
        { action: 'INVOICE_GENERATED', user_name: 'Admin User', user_role: 'admin', details: 'Generated Invoice INV-100201 for ₹8000', category: 'BILLING' },
        { action: 'STOCK_RESTOCKED', user_name: 'Admin User', user_role: 'admin', details: 'Restocked Paracetamol 650mg (+200 units)', category: 'PHARMACY' },
      ]);
      console.log('✅ Auto-seeded 5 audit log entries');
    }

    const totalUsers = await User.countDocuments();
    console.log(`✅ Database ready! (${totalUsers} users registered)`);
    console.log('   Demo Logins (Password: demo1234):');
    console.log('   - patient@demo.com (Patient)');
    console.log('   - doctor@demo.com  (Doctor - Cardiology)');
    console.log('   - admin@demo.com   (Admin / Hospital Director)');
  } catch (err) {
    console.error('❌ Database seeding error:', err);
  }
};

// Mongoose connection event listeners
mongoose.connection.on('connected', () => {
  console.log('✅ Mongoose connected to MongoDB Atlas');
});
mongoose.connection.on('error', (err) => {
  console.error('❌ Mongoose connection error:', err.message);
});
mongoose.connection.on('disconnected', () => {
  console.warn('⚠️ Mongoose disconnected from MongoDB Atlas');
});

// Database Connection & Standalone Server Startup
const connectDbAndStart = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log(`Connected to MongoDB ${MONGODB_URI.includes('localhost') ? 'Locally' : 'Atlas'} (database: medvault_db)`);
    await seedDatabase();
  } catch (err) {
    console.error('❌ Initial MongoDB connection failed:', err.message);
  }

  let chosenPort = Number(PORT);
  if (typeof detectPort === 'function') {
    try {
      const freePort = await detectPort(chosenPort);
      if (Number(freePort) !== Number(chosenPort)) {
        console.log(`Port ${chosenPort} in use, switching to free port ${freePort}`);
        chosenPort = freePort;
      }
    } catch (e) {
      console.warn('Port detection warning:', e.message);
    }
  }

  app.listen(chosenPort, () => {
    console.log(`🚀 MedVault Express API Server running on port ${chosenPort}`);
  });
};

if (require.main === module) {
  connectDbAndStart();
}

module.exports = app;
