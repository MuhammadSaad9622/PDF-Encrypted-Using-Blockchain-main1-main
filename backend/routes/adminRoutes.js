import express from 'express';
import {
  adminLogin,
  getAllUsers,
  getUserById,
  getUserNFTDetails,
  updateUser,
  deleteUser,
  getAnalytics,
  getDashboardStats,
  getBillingInvoices,
  suspendUser,
  unsuspendUser,
  updateUserNotes,
  cancelUserSubscription
} from '../controllers/adminController.js';
import {
  createAccessCode,
  getAccessCodes,
  updateAccessCode,
  deleteAccessCode
} from '../controllers/accessCodeController.js';
import { adminAuth } from '../middleware/adminAuth.js';

const router = express.Router();

// Admin login (public)
router.post('/login', adminLogin);

// All routes below require admin authentication
router.use(adminAuth);

// Dashboard and analytics
router.get('/dashboard/stats', getDashboardStats);
router.get('/analytics', getAnalytics);

// User management
router.get('/users', getAllUsers);
router.get('/users/:userId', getUserById);
router.get('/users/:userId/nfts', getUserNFTDetails);
router.put('/users/:userId', updateUser);
router.delete('/users/:userId', deleteUser);
router.post('/users/:userId/suspend', suspendUser);
router.post('/users/:userId/unsuspend', unsuspendUser);
router.put('/users/:userId/notes', updateUserNotes);

// Billing and invoices
router.get('/billing/invoices', getBillingInvoices);

// Subscription management
router.post('/users/:userId/subscription/cancel', cancelUserSubscription);

// Access code management
router.post('/access-codes', createAccessCode);
router.get('/access-codes', getAccessCodes);
router.put('/access-codes/:id', updateAccessCode);
router.delete('/access-codes/:id', deleteAccessCode);

export default router;

