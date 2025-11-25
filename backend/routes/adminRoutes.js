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
  getBillingInvoices
} from '../controllers/adminController.js';
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

// Billing and invoices
router.get('/billing/invoices', getBillingInvoices);

export default router;

