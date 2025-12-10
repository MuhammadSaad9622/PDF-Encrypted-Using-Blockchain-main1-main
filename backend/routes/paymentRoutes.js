import express from 'express';
import {
  createSubscriptionPayment,
  processSubscriptionPayment,
  handleSquareWebhook,
  getSubscriptionStatus,
  getSquareConfig,
  getSquareLocations
} from '../controllers/paymentController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Public webhook route (no auth, but signature verified in controller)
// Use express.raw() to get raw body for signature verification
router.post('/square/webhook', express.raw({ type: 'application/json' }), handleSquareWebhook);

// Public Square config route (needed for frontend SDK initialization)
router.get('/square/config', getSquareConfig);

// Public Square locations route (to help debug location ID issues)
router.get('/square/locations', getSquareLocations);

// Authenticated payment routes
router.post('/square/create-subscription', authenticate, createSubscriptionPayment);
router.post('/square/process-subscription', authenticate, processSubscriptionPayment);
router.get('/subscription/status', authenticate, getSubscriptionStatus);

export default router;

