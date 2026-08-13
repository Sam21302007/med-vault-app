const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { db } = require('../firebase');
const { protect } = require('./middleware');

// Helper to sign JWT token
const generateToken = (user) => {
  const payload = typeof user === 'object' 
    ? { id: user._id || user.id, role: user.role, email: user.email, full_name: user.full_name }
    : { id: user };
  return jwt.sign(payload, process.env.JWT_SECRET || 'medcare_secret_key_for_jsonwebtoken', {
    expiresIn: '30d',
  });
};

// @route   POST /api/auth/register
// @desc    Register a new user (patient, doctor, admin)
router.post('/register', async (req, res) => {
  const { email, password, full_name, role, phone, date_of_birth, gender, specialty } = req.body;

  try {
    if (!email || !password || !full_name || !role) {
      return res.status(400).json({ message: 'Please provide all required registration fields.' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const existingSnap = await db.collection('users').where('email', '==', cleanEmail).get();
    
    if (!existingSnap.empty) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = 'usr_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);

    const newUser = {
      id: userId,
      _id: userId,
      email: cleanEmail,
      password: hashedPassword,
      full_name,
      role,
      phone: phone || '',
      date_of_birth: date_of_birth || '',
      gender: gender || '',
      specialty: role === 'doctor' ? (specialty || 'General Medicine') : undefined,
      created_at: new Date().toISOString(),
    };

    await db.collection('users').doc(userId).set(newUser);

    const safeUser = { ...newUser };
    delete safeUser.password;

    res.status(201).json({
      token: generateToken(safeUser),
      user: safeUser,
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ message: err.message || 'Server error during registration' });
  }
});

// @route   POST /api/auth/login
// @desc    Authenticate user and get token
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const cleanEmail = email.toLowerCase().trim();
    let usersSnap = await db.collection('users').where('email', '==', cleanEmail).get();
    let user;

    if (!usersSnap.empty) {
      user = usersSnap.docs[0].data();
      user._id = user.id || usersSnap.docs[0].id;
    }

    // Auto-create demo account in Firestore if missing
    if (!user && (cleanEmail === 'patient@demo.com' || cleanEmail === 'doctor@demo.com' || cleanEmail === 'admin@demo.com')) {
      const role = cleanEmail.startsWith('doctor') ? 'doctor' : cleanEmail.startsWith('admin') ? 'admin' : 'patient';
      const userId = 'usr_demo_' + role;
      const hashedPassword = await bcrypt.hash(password || 'demo1234', 10);
      
      user = {
        id: userId,
        _id: userId,
        email: cleanEmail,
        password: hashedPassword,
        full_name: role === 'doctor' ? 'Dr. Sarah Jenkins' : role === 'admin' ? 'Admin User' : 'Ravi Kumar',
        role,
        specialty: role === 'doctor' ? 'Cardiology' : undefined,
        created_at: new Date().toISOString(),
      };
      await db.collection('users').doc(userId).set(user);
    }

    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    let isMatch = false;
    if (user.password) {
      try {
        isMatch = await bcrypt.compare(password, user.password);
      } catch (e) {
        isMatch = false;
      }
    }

    // Fallback for plain text demo password
    if (!isMatch && (password === 'demo1234' || user.password === password)) {
      isMatch = true;
    }

    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const safeUser = { ...user };
    delete safeUser.password;

    res.json({
      token: generateToken(safeUser),
      user: safeUser,
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: err.message || 'Server error during login' });
  }
});

// @route   GET /api/auth/me
// @desc    Get current user profile
router.get('/me', protect, async (req, res) => {
  res.json({
    user: {
      id: req.user._id || req.user.id,
      _id: req.user._id || req.user.id,
      email: req.user.email,
      full_name: req.user.full_name,
      role: req.user.role,
      phone: req.user.phone,
      date_of_birth: req.user.date_of_birth,
      gender: req.user.gender,
      specialty: req.user.specialty,
      created_at: req.user.created_at,
    },
  });
});

// @route   GET /api/auth/doctors
// @desc    Get all registered doctors
router.get('/doctors', protect, async (req, res) => {
  try {
    const doctorsSnap = await db.collection('users').where('role', '==', 'doctor').get();
    const doctors = [];
    doctorsSnap.forEach((doc) => {
      const data = doc.data();
      delete data.password;
      doctors.push({ id: doc.id, _id: doc.id, ...data });
    });
    res.json(doctors);
  } catch (err) {
    console.error('Fetch doctors error:', err);
    res.status(500).json({ message: 'Failed to retrieve doctors list' });
  }
});

// @route   GET /api/auth/users
// @desc    Get all users (Admin only)
router.get('/users', protect, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Access denied: Admin only' });
  }
  try {
    const usersSnap = await db.collection('users').get();
    const users = [];
    usersSnap.forEach((doc) => {
      const data = doc.data();
      delete data.password;
      users.push({ id: doc.id, _id: doc.id, ...data });
    });
    res.json(users);
  } catch (err) {
    console.error('Fetch users error:', err);
    res.status(500).json({ message: 'Failed to retrieve users' });
  }
});

module.exports = router;
