import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { getUserById } from '../config/db.js';

export const signToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      name: user.name
    },
    config.jwtSecret,
    { expiresIn: '7d' }
  );
};

export const authenticateUser = (req, res, next) => {
  try {
    let token = null;

    // 1. Check httpOnly cookie
    if (req.cookies && req.cookies.sentiagent_token) {
      token = req.cookies.sentiagent_token;
    }
    // 2. Check Authorization Bearer header (allows easy API/test client calls)
    else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required. Please log in.'
      });
    }

    const decoded = jwt.verify(token, config.jwtSecret);
    const user = getUserById(decoded.id);

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User account not found or session has expired.'
      });
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Session expired. Please log in again.'
      });
    }
    return res.status(401).json({
      success: false,
      error: 'Invalid authentication token.'
    });
  }
};
