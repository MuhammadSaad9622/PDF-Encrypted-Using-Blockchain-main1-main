import express from 'express';
import { getUserStats } from '../controllers/statsController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Support both authenticated and unauthenticated (with walletAddress query param) access
router.get('/user-stats', authenticate, getUserStats);
router.get('/wallet-stats', getUserStats); // Direct wallet address access (no auth required)

export default router;

