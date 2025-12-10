import express from 'express';
import { signup, signin, getCurrentUser, updateWalletAddress, updateProfile, getUserInvoices, getUserNotes, markNotesAsRead } from '../controllers/authController.js';
import { validateAccessCode } from '../controllers/accessCodeController.js';
import { validateReferralCode, getReferralStats, getReferralHistory } from '../controllers/referralController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Public routes
router.post('/signup', signup);
router.post('/signin', signin);
router.post('/validate-access-code', validateAccessCode);
router.post('/validate-referral-code', validateReferralCode);

// Protected routes
router.get('/me', authenticate, getCurrentUser);
router.get('/invoices', authenticate, getUserInvoices);
router.put('/wallet', authenticate, updateWalletAddress);
router.put('/profile', authenticate, updateProfile);
router.get('/referral/stats', authenticate, getReferralStats);
router.get('/referral/history', authenticate, getReferralHistory);
router.get('/notes', authenticate, getUserNotes);
router.post('/notes/mark-read', authenticate, markNotesAsRead);

export default router;

