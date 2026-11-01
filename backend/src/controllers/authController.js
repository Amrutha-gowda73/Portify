const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../config/env');
const { makeId } = require('../utils/store');
const { getUserByEmail, insertUser } = require('../utils/storage');

function signToken(user) {
  return jwt.sign({ userId: user.id }, jwtSecret, { expiresIn: '7d' });
}

async function register(req, res) {
  try {
    const { name, email, password, confirmPassword } = req.body;

    if (!name || !email || !password || !confirmPassword) {
      return res.status(400).json({ success: false, message: 'All fields are required.' });
    }

    if (password.length < 8) {
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters long.' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ success: false, message: 'Passwords do not match.' });
    }

    if (await getUserByEmail(email)) {
      return res.status(409).json({ success: false, message: 'An account with this email already exists.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = {
      id: makeId('user'),
      name: name.trim(),
      email: email.trim().toLowerCase(),
      passwordHash,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await insertUser(user);
    const token = signToken(user);

    return res.status(201).json({
      success: true,
      message: 'Registration successful.',
      user: { id: user.id, name: user.name, email: user.email },
      token,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: 'An account with this email already exists.' });
    }
    return res.status(500).json({ success: false, message: 'Unable to create account.', error: error.message });
  }
}

async function login(req, res) {
  try {
    const { email, password } = req.body;
    const user = await getUserByEmail(email);

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const token = signToken(user);
    return res.json({
      success: true,
      message: 'Logged in successfully.',
      user: { id: user.id, name: user.name, email: user.email },
      token,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Unable to log in.', error: error.message });
  }
}

function me(req, res) {
  return res.json({
    success: true,
    user: { id: req.user.id, name: req.user.name, email: req.user.email },
  });
}

module.exports = { register, login, me };
