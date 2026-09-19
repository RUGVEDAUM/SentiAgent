import express from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { createUser, getUserByEmail } from '../config/db.js';
import { signToken, authenticateUser } from '../middleware/auth.js';

const router = express.Router();

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
};

/**
 * POST /api/auth/signup
 */
router.post('/signup', async (req, res, next) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({
        success: false,
        error: 'Please provide name, email, and password.'
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      return res.status(400).json({
        success: false,
        error: 'Please enter a valid email address.'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 6 characters long.'
      });
    }

    const existing = getUserByEmail(cleanEmail);
    if (existing) {
      return res.status(409).json({
        success: false,
        error: 'An account with this email already exists.'
      });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    const userId = uuidv4();

    const newUser = createUser({
      id: userId,
      email: cleanEmail,
      passwordHash,
      name: name.trim()
    });

    const token = signToken(newUser);
    res.cookie('sentiagent_token', token, COOKIE_OPTIONS);

    res.status(201).json({
      success: true,
      message: 'Account created successfully.',
      token, // Also return token for test/API clients
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        createdAt: newUser.createdAt
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/auth/login
 */
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required.'
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = getUserByEmail(cleanEmail);

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password.'
      });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password.'
      });
    }

    const token = signToken(user);
    res.cookie('sentiagent_token', token, COOKIE_OPTIONS);

    res.json({
      success: true,
      message: 'Logged in successfully.',
      token, // Also return token for test/API clients
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/auth/logout
 */
router.post('/logout', (req, res) => {
  res.clearCookie('sentiagent_token', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production'
  });

  res.json({
    success: true,
    message: 'Logged out successfully.'
  });
});

/**
 * GET /api/auth/me (Current User)
 */
router.get('/me', authenticateUser, (req, res) => {
  res.json({
    success: true,
    user: req.user
  });
});

export default router;
