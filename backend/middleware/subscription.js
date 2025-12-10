import User from '../models/User.js';

/**
 * Middleware to check if user has active subscription
 */
export const checkSubscription = async (req, res, next) => {
  try {
    const userId = req.userId;
    
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if user has active subscription
    if (user.subscriptionStatus !== 'active') {
      return res.status(403).json({ 
        error: 'Active subscription required',
        requiresSubscription: true,
        currentStatus: user.subscriptionStatus
      });
    }

    // Check if subscription has expired
    if (user.subscriptionEndDate && new Date() > user.subscriptionEndDate) {
      user.subscriptionStatus = 'expired';
      await user.save();
      
      return res.status(403).json({ 
        error: 'Your subscription has expired',
        requiresSubscription: true,
        expiredDate: user.subscriptionEndDate
      });
    }

    // Attach user to request for file size checking
    req.user = user;
    next();

  } catch (error) {
    console.error('Error checking subscription:', error);
    res.status(500).json({ error: 'Failed to verify subscription status' });
  }
};

/**
 * Middleware to check file size limit before upload
 */
export const checkFileSizeLimit = async (req, res, next) => {
  try {
    const userId = req.userId;
    const fileSize = req.files?.pdf?.size || 0;
    
    if (!fileSize) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if user has active subscription
    if (user.subscriptionStatus !== 'active') {
      return res.status(403).json({ 
        error: 'Active subscription required to upload files',
        requiresSubscription: true
      });
    }

    // Check total file size limit (250MB = 262144000 bytes)
    const maxSize = user.fileSizeLimit || (250 * 1024 * 1024);
    const currentUsed = user.totalFileSizeUsed || 0;
    const newTotal = currentUsed + fileSize;

    if (newTotal > maxSize) {
      const remainingMB = ((maxSize - currentUsed) / (1024 * 1024)).toFixed(2);
      return res.status(403).json({ 
        error: `File size limit exceeded. You have ${remainingMB} MB remaining out of ${(maxSize / (1024 * 1024))} MB limit.`,
        currentUsed: currentUsed,
        fileSize: fileSize,
        limit: maxSize,
        remaining: maxSize - currentUsed
      });
    }

    req.fileSize = fileSize;
    req.user = user;
    next();

  } catch (error) {
    console.error('Error checking file size limit:', error);
    res.status(500).json({ error: 'Failed to check file size limit' });
  }
};

