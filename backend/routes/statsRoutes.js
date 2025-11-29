import express from 'express';
import { getUserStats } from '../controllers/statsController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// User stats endpoint (requires authentication, fetches from database - no wallet required)
router.get('/user-stats', authenticate, getUserStats);

export default router;

