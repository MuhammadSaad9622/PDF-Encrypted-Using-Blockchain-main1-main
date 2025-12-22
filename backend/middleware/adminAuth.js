import jwt from 'jsonwebtoken';
import { userService } from '../services/userService.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export const adminAuth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1]; // Bearer <token>

    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;

    // Verify user is admin
    const user = await userService.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    req.adminUser = user;
    next();
  } catch (error) {
    console.error('Admin authentication error:', error);
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

