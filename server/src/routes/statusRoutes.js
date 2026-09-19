import express from 'express';
import { getAvailableFeatures } from '../config/env.js';

const router = express.Router();

/**
 * GET /api/status
 * Returns system readiness and enabled features
 */
router.get('/', (req, res) => {
  const features = getAvailableFeatures();

  res.json({
    success: true,
    name: 'SentiAgent API Engine',
    status: 'online',
    timestamp: new Date().toISOString(),
    features
  });
});

export default router;
