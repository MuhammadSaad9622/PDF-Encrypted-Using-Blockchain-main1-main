import { accessCodeService } from '../services/accessCodeService.js';

// Validate access code
export const validateAccessCode = async (req, res) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'Access code is required' });
    }

    const normalizedCode = code.toUpperCase().trim();
    const accessCode = await accessCodeService.findByCode(normalizedCode);

    if (!accessCode) {
      return res.status(404).json({ 
        valid: false, 
        error: 'Invalid access code' 
      });
    }

    const validation = accessCodeService.isValid(accessCode);
    
    if (!validation.valid) {
      return res.status(400).json({ 
        valid: false, 
        error: validation.reason 
      });
    }

    const requiresPayment = !!accessCode.subscriptionPlan;
    console.log('Access code validation:', {
      code: accessCode.code,
      subscriptionPlan: accessCode.subscriptionPlan,
      subscriptionDuration: accessCode.subscriptionDuration,
      requiresPayment: requiresPayment
    });

    res.status(200).json({
      valid: true,
      code: accessCode.code,
      remainingUses: accessCode.maxUses !== null 
        ? accessCode.maxUses - accessCode.usedCount 
        : null,
      // Include subscription info so frontend knows if payment is required
      subscriptionPlan: accessCode.subscriptionPlan || null,
      subscriptionDuration: accessCode.subscriptionDuration || null,
      requiresPayment: requiresPayment // If there's a plan, payment is required upfront
    });
  } catch (error) {
    console.error('Validate access code error:', error);
    res.status(500).json({ error: error.message || 'Error validating access code' });
  }
};

// Create access code (admin only)
export const createAccessCode = async (req, res) => {
  try {
    const { code, maxUses, expiresAt, description, subscriptionPlan, subscriptionDuration } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'Access code is required' });
    }

    const normalizedCode = code.toUpperCase().trim();

    // Check if code already exists
    const existing = await accessCodeService.findByCode(normalizedCode);
    if (existing) {
      return res.status(400).json({ error: 'Access code already exists' });
    }

    const accessCode = await accessCodeService.create({
      code: normalizedCode,
      maxUses: maxUses || null,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      description: description || '',
      subscriptionPlan: subscriptionPlan || null,
      subscriptionDuration: subscriptionDuration || null,
      createdBy: req.userId || null
    });

    res.status(201).json({
      success: true,
      accessCode: {
        id: accessCode.id,
        code: accessCode.code,
        isActive: accessCode.isActive,
        maxUses: accessCode.maxUses,
        usedCount: accessCode.usedCount,
        expiresAt: accessCode.expiresAt,
        description: accessCode.description,
        subscriptionPlan: accessCode.subscriptionPlan,
        subscriptionDuration: accessCode.subscriptionDuration,
        createdAt: accessCode.createdAt
      }
    });
  } catch (error) {
    console.error('Create access code error:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Access code already exists' });
    }
    
    res.status(500).json({ error: error.message || 'Error creating access code' });
  }
};

// Get all access codes (admin only)
export const getAccessCodes = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const query = {};
    if (req.query.isActive !== undefined) {
      query.isActive = req.query.isActive === 'true';
    }

    const accessCodes = await accessCodeService.find(query, {
      sort: { createdAt: -1 },
      skip,
      limit
    });

    // Get createdBy user info for each code
    const accessCodesWithUsers = await Promise.all(accessCodes.map(async (ac) => {
      let createdByUser = null;
      if (ac.createdBy) {
        try {
          const { userService } = await import('../services/userService.js');
          createdByUser = await userService.findById(ac.createdBy);
          if (createdByUser) {
            createdByUser = {
              name: createdByUser.name,
              email: createdByUser.email
            };
          }
        } catch (e) {
          // User not found, leave as null
        }
      }
      return {
        ...ac,
        createdBy: createdByUser
      };
    }));

    const total = await accessCodeService.count(query);

    res.status(200).json({
      success: true,
      accessCodes: accessCodesWithUsers.map(ac => ({
        id: ac.id,
        code: ac.code,
        isActive: ac.isActive,
        maxUses: ac.maxUses,
        usedCount: ac.usedCount,
        remainingUses: ac.maxUses !== null ? ac.maxUses - ac.usedCount : null,
        expiresAt: ac.expiresAt,
        description: ac.description,
        subscriptionPlan: ac.subscriptionPlan,
        subscriptionDuration: ac.subscriptionDuration,
        createdBy: ac.createdBy,
        createdAt: ac.createdAt,
        updatedAt: ac.updatedAt
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get access codes error:', error);
    res.status(500).json({ error: error.message || 'Error fetching access codes' });
  }
};

// Update access code (admin only)
export const updateAccessCode = async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive, maxUses, expiresAt, description, subscriptionPlan, subscriptionDuration } = req.body;

    const updateData = {};
    if (isActive !== undefined) updateData.isActive = isActive;
    if (maxUses !== undefined) updateData.maxUses = maxUses;
    if (expiresAt !== undefined) updateData.expiresAt = expiresAt ? new Date(expiresAt) : null;
    if (description !== undefined) updateData.description = description;
    if (subscriptionPlan !== undefined) updateData.subscriptionPlan = subscriptionPlan || null;
    if (subscriptionDuration !== undefined) updateData.subscriptionDuration = subscriptionDuration || null;

    const accessCode = await accessCodeService.update(id, updateData);
    if (!accessCode) {
      return res.status(404).json({ error: 'Access code not found' });
    }

    res.status(200).json({
      success: true,
      accessCode: {
        id: accessCode.id,
        code: accessCode.code,
        isActive: accessCode.isActive,
        maxUses: accessCode.maxUses,
        usedCount: accessCode.usedCount,
        expiresAt: accessCode.expiresAt,
        description: accessCode.description,
        subscriptionPlan: accessCode.subscriptionPlan,
        subscriptionDuration: accessCode.subscriptionDuration,
        updatedAt: accessCode.updatedAt
      }
    });
  } catch (error) {
    console.error('Update access code error:', error);
    res.status(500).json({ error: error.message || 'Error updating access code' });
  }
};

// Delete access code (admin only)
export const deleteAccessCode = async (req, res) => {
  try {
    const { id } = req.params;

    const accessCode = await accessCodeService.findById(id);
    if (!accessCode) {
      return res.status(404).json({ error: 'Access code not found' });
    }

    await accessCodeService.delete(id);

    res.status(200).json({
      success: true,
      message: 'Access code deleted successfully'
    });
  } catch (error) {
    console.error('Delete access code error:', error);
    res.status(500).json({ error: error.message || 'Error deleting access code' });
  }
};

