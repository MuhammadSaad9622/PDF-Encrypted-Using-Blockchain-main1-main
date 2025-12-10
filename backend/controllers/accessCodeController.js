import AccessCode from '../models/AccessCode.js';

// Validate access code
export const validateAccessCode = async (req, res) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'Access code is required' });
    }

    const normalizedCode = code.toUpperCase().trim();
    const accessCode = await AccessCode.findOne({ code: normalizedCode });

    if (!accessCode) {
      return res.status(404).json({ 
        valid: false, 
        error: 'Invalid access code' 
      });
    }

    const validation = accessCode.isValid();
    
    if (!validation.valid) {
      return res.status(400).json({ 
        valid: false, 
        error: validation.reason 
      });
    }

    res.status(200).json({
      valid: true,
      code: accessCode.code,
      remainingUses: accessCode.maxUses !== null 
        ? accessCode.maxUses - accessCode.usedCount 
        : null
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
    const existing = await AccessCode.findOne({ code: normalizedCode });
    if (existing) {
      return res.status(400).json({ error: 'Access code already exists' });
    }

    const accessCode = new AccessCode({
      code: normalizedCode,
      maxUses: maxUses || null,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      description: description || '',
      subscriptionPlan: subscriptionPlan || null,
      subscriptionDuration: subscriptionDuration || null,
      createdBy: req.userId || null
    });

    await accessCode.save();

    res.status(201).json({
      success: true,
      accessCode: {
        id: accessCode._id.toString(),
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

    const accessCodes = await AccessCode.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('createdBy', 'name email');

    const total = await AccessCode.countDocuments(query);

    res.status(200).json({
      success: true,
      accessCodes: accessCodes.map(ac => ({
        id: ac._id.toString(),
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

    const accessCode = await AccessCode.findById(id);
    if (!accessCode) {
      return res.status(404).json({ error: 'Access code not found' });
    }

    if (isActive !== undefined) accessCode.isActive = isActive;
    if (maxUses !== undefined) accessCode.maxUses = maxUses;
    if (expiresAt !== undefined) accessCode.expiresAt = expiresAt ? new Date(expiresAt) : null;
    if (description !== undefined) accessCode.description = description;
    if (subscriptionPlan !== undefined) accessCode.subscriptionPlan = subscriptionPlan || null;
    if (subscriptionDuration !== undefined) accessCode.subscriptionDuration = subscriptionDuration || null;

    await accessCode.save();

    res.status(200).json({
      success: true,
      accessCode: {
        id: accessCode._id.toString(),
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

    const accessCode = await AccessCode.findByIdAndDelete(id);
    if (!accessCode) {
      return res.status(404).json({ error: 'Access code not found' });
    }

    res.status(200).json({
      success: true,
      message: 'Access code deleted successfully'
    });
  } catch (error) {
    console.error('Delete access code error:', error);
    res.status(500).json({ error: error.message || 'Error deleting access code' });
  }
};

