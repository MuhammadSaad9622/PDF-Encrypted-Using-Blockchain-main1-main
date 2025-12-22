import mongoose from 'mongoose';

const accessCodeSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true,
    index: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  maxUses: {
    type: Number,
    default: null // null means unlimited uses
  },
  usedCount: {
    type: Number,
    default: 0
  },
  expiresAt: {
    type: Date,
    default: null // null means no expiration
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  description: {
    type: String,
    default: ''
  },
  // Subscription plan assigned when using this access code
  subscriptionPlan: {
    type: String,
    enum: ['basic', 'monthly', 'yearly', 'lifetime', null],
    default: null
  },
  // Subscription duration in days (for monthly/yearly plans)
  subscriptionDuration: {
    type: Number,
    default: null // null means use default for the plan
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update updatedAt before saving
accessCodeSchema.pre('save', function(next) {
  if (this.isModified() && !this.isNew) {
    this.updatedAt = Date.now();
  }
  next();
});

// Method to check if code is valid
accessCodeSchema.methods.isValid = function() {
  if (!this.isActive) {
    return { valid: false, reason: 'Code is inactive' };
  }
  
  if (this.expiresAt && new Date() > this.expiresAt) {
    return { valid: false, reason: 'Code has expired' };
  }
  
  if (this.maxUses !== null && this.usedCount >= this.maxUses) {
    return { valid: false, reason: 'Code has reached maximum uses' };
  }
  
  return { valid: true };
};

// Method to increment usage
accessCodeSchema.methods.incrementUsage = async function() {
  this.usedCount += 1;
  await this.save();
};

const AccessCode = mongoose.model('AccessCode', accessCodeSchema);

export default AccessCode;

