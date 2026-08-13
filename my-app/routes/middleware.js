const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'medcare_secret_key_for_jsonwebtoken');
      
      // Get user from database with fallback to decoded payload
      try {
        req.user = await User.findById(decoded.id).select('-password');
      } catch (dbErr) {
        console.warn('DB User lookup warning in protect middleware:', dbErr.message);
      }

      if (!req.user && decoded.id) {
        req.user = {
          _id: decoded.id,
          id: decoded.id,
          full_name: decoded.full_name || 'MedVault User',
          email: decoded.email || 'user@demo.com',
          role: decoded.role || 'patient',
        };
      }

      if (!req.user) {
        return res.status(401).json({ message: 'User not found' });
      }
      return next();
    } catch (err) {
      console.error('Token verification error:', err.message);
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token provided' });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: `Role '${req.user?.role || 'Guest'}' is not authorized to access this resource` });
    }
    next();
  };
};

const verifyToken = protect;
const verifyRole = (roles) => authorize(...(Array.isArray(roles) ? roles : [roles]));

module.exports = { protect, authorize, verifyToken, verifyRole };
