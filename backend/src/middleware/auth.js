const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../config/env');
const { getUserById } = require('../utils/storage');

async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ success: false, message: 'Authentication required.' });
  }

  let decoded;
  try {
    decoded = jwt.verify(token, jwtSecret);
  } catch {
    return res.status(401).json({ success: false, message: 'Invalid or expired token.' });
  }

  const user = await getUserById(decoded.userId);
  if (!user) return res.status(401).json({ success: false, message: 'User not found.' });
  req.user = user;
  return next();
}

module.exports = { authenticate };
