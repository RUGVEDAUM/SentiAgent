import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { config } from './config/env.js';
import { errorHandler } from './middleware/errorHandler.js';
import authRoutes from './routes/authRoutes.js';
import analysisRoutes from './routes/analysisRoutes.js';
import statusRoutes from './routes/statusRoutes.js';
import { closeDb } from './config/db.js';

const app = express();

// --- Rate Limiting ---
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 150,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests. Please try again in 15 minutes.' }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many login attempts. Please try again in 15 minutes.' }
});

const analysisLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many analysis requests. Please wait a moment.' }
});

// --- CORS ---
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000'
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(null, true); // Permissive in local dev
  },
  credentials: true
}));

app.use(cookieParser());
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));
app.use(generalLimiter);

// --- Health Check ---
app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() });
});

// --- Routes ---
app.use('/api/status', statusRoutes);
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/analyses', analysisLimiter, analysisRoutes);

// --- Error Handler ---
app.use(errorHandler);

const PORT = config.port;
const server = app.listen(PORT, () => {
  console.log(`===============================================`);
  console.log(`🚀 SentiAgent API Server running on port ${PORT}`);
  console.log(`📡 URL: http://localhost:${PORT}`);
  console.log(`🔍 Status: http://localhost:${PORT}/api/status`);
  console.log(`===============================================`);
});

const shutdown = () => {
  console.log('\n🛑 Shutting down SentiAgent server...');
  server.close(() => {
    try { closeDb(); } catch (e) { /* ignore */ }
    process.exit(0);
  });
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
export default app;
