const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
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
    const userExists = await User.findOne({ email: cleanEmail });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    const user = await User.create({
      email: cleanEmail,
      password,
      full_name,
      role,
      phone,
      date_of_birth,
      gender,
      specialty: role === 'doctor' ? specialty : undefined,
    });

    res.status(201).json({
      token: generateToken(user._id),
      user: {
        id: user._id,
        _id: user._id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        phone: user.phone,
        date_of_birth: user.date_of_birth,
        gender: user.gender,
        specialty: user.specialty,
        created_at: user.created_at,
      },
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
    const user = await User.findOne({ email: cleanEmail });
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    let isMatch = false;
    try {
      if (typeof user.comparePassword === 'function') {
        isMatch = await user.comparePassword(password);
      }
    } catch (e) {
      isMatch = false;
    }

    // Fallback: Check if password stored in DB was plain text
    if (!isMatch && user.password === password) {
      isMatch = true;
      user.password = password; // Save will trigger pre-save bcrypt hash
      await user.save();
    }

    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    res.json({
      token: generateToken(user._id),
      user: {
        id: user._id,
        _id: user._id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        phone: user.phone,
        date_of_birth: user.date_of_birth,
        gender: user.gender,
        specialty: user.specialty,
        created_at: user.created_at,
      },
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
      id: req.user._id,
      _id: req.user._id,
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
// @desc    Get all registered doctors (used by patients to select a doctor)
router.get('/doctors', protect, async (req, res) => {
  try {
    const doctors = await User.find({ role: 'doctor' }).select('-password').sort('full_name');
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
    const users = await User.find({}).select('-password').sort('-created_at');
    res.json(users);
  } catch (err) {
    console.error('Fetch users error:', err);
    res.status(500).json({ message: 'Failed to retrieve users' });
  }
});

module.exports = router;
