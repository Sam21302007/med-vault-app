const express = require('express');
const router = express.Router();
const AuditLog = require('../models/AuditLog');
const { verifyToken, verifyRole } = require('./middleware');

// GET /api/audit - Get recent audit logs (Admin only)
router.get('/', verifyToken, verifyRole(['admin']), async (req, res) => {
  try {
    const logs = await AuditLog.find().sort({ createdAt: -1 }).limit(100);
    res.json(logs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
