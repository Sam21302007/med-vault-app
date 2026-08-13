const mongoose = require('mongoose');
const { format, addDays, subDays } = require('date-fns');
require('dotenv').config();

const User = require('../models/User');
const Appointment = require('../models/Appointment');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://samaug24cs_db_user:PdtXSiVRnMnvd6Iz@cluster0.ip5iro2.mongodb.net/medvault_db?retryWrites=true&w=majority';

async function seed() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB Atlas...');

    // Clear existing appointments to replace with fresh rich dataset
    await Appointment.deleteMany({});
    console.log('Cleared old appointments collection.');

    const patients = await User.find({ role: 'patient' });
    const doctors = await User.find({ role: 'doctor' });

    console.log(`Found ${patients.length} patients and ${doctors.length} doctors.`);

    if (patients.length === 0 || doctors.length === 0) {
      console.log('No patients or doctors found to link appointments.');
      process.exit(1);
    }

    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const yesterdayStr = format(subDays(new Date(), 1), 'yyyy-MM-dd');
    const tomorrowStr = format(addDays(new Date(), 1), 'yyyy-MM-dd');
    const dayAfterTomorrowStr = format(addDays(new Date(), 2), 'yyyy-MM-dd');
    const past2DaysStr = format(subDays(new Date(), 2), 'yyyy-MM-dd');

    const sampleAppointments = [
      {
        patient_id: patients[0]._id,
        doctor_id: doctors[0 % doctors.length]._id,
        appointment_date: todayStr,
        time_slot: '09:30 AM',
        status: 'confirmed',
        priority: 'urgent',
        reason: 'Hypertension follow-up & ECG Consultation',
        notes: 'Patient reports morning blood pressure spike (145/90).'
      },
      {
        patient_id: patients[1 % patients.length]._id,
        doctor_id: doctors[1 % doctors.length]._id,
        appointment_date: todayStr,
        time_slot: '11:00 AM',
        status: 'confirmed',
        priority: 'normal',
        reason: 'Skin allergy rash evaluation',
        notes: 'Pruritic erythematous lesions on both forearms.'
      },
      {
        patient_id: patients[2 % patients.length]._id,
        doctor_id: doctors[2 % doctors.length]._id,
        appointment_date: todayStr,
        time_slot: '02:30 PM',
        status: 'pending',
        priority: 'emergency',
        reason: 'Severe acute migraine attack',
        notes: 'Unilateral throbbing headache with photophobia.'
      },
      {
        patient_id: patients[3 % patients.length]._id,
        doctor_id: doctors[3 % doctors.length]._id,
        appointment_date: todayStr,
        time_slot: '04:00 PM',
        status: 'confirmed',
        priority: 'normal',
        reason: 'Bilateral knee joint pain checkup',
        notes: 'Joint stiffness upon climbing stairs.'
      },
      {
        patient_id: patients[4 % patients.length]._id,
        doctor_id: doctors[4 % doctors.length]._id,
        appointment_date: yesterdayStr,
        time_slot: '10:15 AM',
        status: 'completed',
        priority: 'normal',
        reason: 'Sinus pressure & nasal congestion',
        notes: 'Prescribed Amoxicillin-Clavulanate 625mg.'
      },
      {
        patient_id: patients[5 % patients.length]._id,
        doctor_id: doctors[5 % doctors.length]._id,
        appointment_date: yesterdayStr,
        time_slot: '12:00 PM',
        status: 'completed',
        priority: 'urgent',
        reason: 'Asthma exacerbation checkup',
        notes: 'Spirometry test performed. Nebulization given.'
      },
      {
        patient_id: patients[6 % patients.length]._id,
        doctor_id: doctors[6 % doctors.length]._id,
        appointment_date: tomorrowStr,
        time_slot: '10:00 AM',
        status: 'pending',
        priority: 'normal',
        reason: 'Routine pediatric growth checkup',
        notes: 'Annual developmental milestones verification.'
      },
      {
        patient_id: patients[7 % patients.length]._id,
        doctor_id: doctors[7 % doctors.length]._id,
        appointment_date: tomorrowStr,
        time_slot: '11:30 AM',
        status: 'confirmed',
        priority: 'normal',
        reason: 'Vision test & eyeglass prescription',
        notes: 'Refractory vision check and prescription renewal.'
      },
      {
        patient_id: patients[0]._id,
        doctor_id: doctors[1 % doctors.length]._id,
        appointment_date: dayAfterTomorrowStr,
        time_slot: '03:15 PM',
        status: 'confirmed',
        priority: 'normal',
        reason: 'Dermatology routine follow-up',
        notes: 'Check mole progress on upper back.'
      },
      {
        patient_id: patients[1 % patients.length]._id,
        doctor_id: doctors[0 % doctors.length]._id,
        appointment_date: past2DaysStr,
        time_slot: '09:00 AM',
        status: 'completed',
        priority: 'urgent',
        reason: 'Cardiology lipid profile review',
        notes: 'Statin dosage adjusted based on lab reports.'
      }
    ];

    const created = await Appointment.insertMany(sampleAppointments);
    console.log(`Successfully seeded ${created.length} appointments into MongoDB Atlas!`);

    mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Seeding error:', err);
    process.exit(1);
  }
}

seed();
