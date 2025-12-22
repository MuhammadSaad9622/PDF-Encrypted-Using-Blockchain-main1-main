import express from 'express';
import {
  createSubscriptionPayment,
  processSubscriptionPayment,
  handleStripeWebhook,
  getSubscriptionStatus,
  getStripeConfig,
  cancelSubscription,
  verifyCard
} from '../controllers/paymentController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Public webhook route (no auth, but signature verified in controller)
// Use express.raw() to get raw body for signature verification
router.post('/stripe/webhook', express.raw({ type: 'application/json' }), handleStripeWebhook);

// Public Stripe config route (needed for frontend SDK initialization)
router.get('/stripe/config', getStripeConfig);

// Authenticated payment routes
router.post('/stripe/create-subscription', authenticate, createSubscriptionPayment);
router.post('/stripe/process-subscription', authenticate, processSubscriptionPayment);
router.post('/stripe/verify-card', verifyCard); // No auth needed - used during signup
router.get('/subscription/status', authenticate, getSubscriptionStatus);
router.post('/subscription/cancel', authenticate, cancelSubscription);

export default router;

