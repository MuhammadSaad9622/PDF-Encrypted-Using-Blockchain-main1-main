import jwt from 'jsonwebtoken';
import { userService } from '../services/userService.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export const authenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1]; // Bearer <token>

    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    
    // Check if user is suspended
    const user = await userService.findById(decoded.userId);
    if (user && user.isSuspended) {
      return res.status(403).json({ 
        error: 'Your account has been suspended',
        suspended: true,
        reason: user.suspendedReason || 'No reason provided'
      });
    }
    
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

