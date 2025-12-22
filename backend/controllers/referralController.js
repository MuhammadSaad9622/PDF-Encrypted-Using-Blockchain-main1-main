import { userService } from '../services/userService.js';

// Validate referral code
export const validateReferralCode = async (req, res) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'Referral code is required' });
    }

    const normalizedCode = code.toUpperCase().trim();
    const referrer = await userService.findByReferralCode(normalizedCode);

    if (!referrer) {
      return res.status(404).json({ 
        valid: false, 
        error: 'Invalid referral code' 
      });
    }

    res.status(200).json({
      valid: true,
      code: referrer.referralCode,
      referrerName: referrer.name || referrer.email
    });
  } catch (error) {
    console.error('Validate referral code error:', error);
    res.status(500).json({ error: error.message || 'Error validating referral code' });
  }
};

// Get referral statistics for a user
export const getReferralStats = async (req, res) => {
  try {
    const userId = req.userId;

    const user = await userService.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get list of referred users
    const allReferredUsers = await userService.findByReferredBy(userId);
    const referredUsers = allReferredUsers.slice(0, 50);
    const referredCount = allReferredUsers.length;

    res.status(200).json({
      success: true,
      referralCode: user.referralCode,
      stats: {
        totalReferred: referredCount,
        recentReferrals: referredUsers.map(u => ({
          id: u.id,
          name: u.name,
          email: u.email,
          joinedAt: u.createdAt
        }))
      }
    });
  } catch (error) {
    console.error('Get referral stats error:', error);
    res.status(500).json({ error: error.message || 'Error fetching referral statistics' });
  }
};

// Get referral history (all users referred)
export const getReferralHistory = async (req, res) => {
  try {
    const userId = req.userId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const allReferredUsers = await userService.findByReferredBy(userId);
    const total = allReferredUsers.length;
    const referredUsers = allReferredUsers.slice(skip, skip + limit);

    res.status(200).json({
      success: true,
      referrals: referredUsers.map(u => ({
        id: u.id,
        name: u.name,
        email: u.email,
        profileComplete: u.profileComplete,
        joinedAt: u.createdAt
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get referral history error:', error);
    res.status(500).json({ error: error.message || 'Error fetching referral history' });
  }
};

