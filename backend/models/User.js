import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  walletAddress: {
    type: String,
    default: null
  },
  name: {
    type: String,
    default: ''
  },
  profilePhoto: {
    type: String,
    default: null
  },
  bio: {
    type: String,
    default: '',
    maxlength: 500
  },
  phone: {
    type: String,
    default: ''
  },
  location: {
    type: String,
    default: ''
  },
  address: {
    type: String,
    default: ''
  },
  city: {
    type: String,
    default: ''
  },
  country: {
    type: String,
    default: ''
  },
  zipCode: {
    type: String,
    default: ''
  },
  website: {
    type: String,
    default: ''
  },
  company: {
    type: String,
    default: ''
  },
  jobTitle: {
    type: String,
    default: ''
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  subscriptionStatus: {
    type: String,
    enum: ['active', 'expired', 'inactive'],
    default: 'inactive'
  },
  subscriptionStartDate: {
    type: Date,
    default: null
  },
  subscriptionEndDate: {
    type: Date,
    default: null
  },
  totalFileSizeUsed: {
    type: Number, // in bytes
    default: 0
  },
  fileSizeLimit: {
    type: Number, // in bytes (250MB = 250 * 1024 * 1024)
    default: 250 * 1024 * 1024 // 250MB default
  },
  lastSubscriptionInvoiceId: {
    type: String,
    default: null
  },
  // Access code used during registration
  accessCode: {
    type: String,
    default: null
  },
  // Referral system
  referredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  referralCode: {
    type: String,
    unique: true,
    sparse: true,
    default: null
  },
  // Agreement tracking
  agreedToTerms: {
    type: Boolean,
    default: false
  },
  agreedToPrivacy: {
    type: Boolean,
    default: false
  },
  agreedToEarlyAdopter: {
    type: Boolean,
    default: false
  },
  agreementDates: {
    terms: { type: Date, default: null },
    privacy: { type: Date, default: null },
    earlyAdopter: { type: Date, default: null }
  },
  // Profile completion status
  profileComplete: {
    type: Boolean,
    default: false
  },
  // Additional address fields for international support
  state: {
    type: String,
    default: ''
  },
  province: {
    type: String,
    default: ''
  },
  // Admin management fields
  adminNotes: {
    type: String,
    default: ''
  },
  adminNotesUpdatedAt: {
    type: Date,
    default: null
  },
  adminNotesLastReadAt: {
    type: Date,
    default: null
  },
  isSuspended: {
    type: Boolean,
    default: false
  },
  suspendedAt: {
    type: Date,
    default: null
  },
  suspendedReason: {
    type: String,
    default: ''
  },
  // Subscription plan (from access code or manual assignment)
  subscriptionPlan: {
    type: String,
    enum: ['basic', 'monthly', 'yearly', 'lifetime', null],
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  // Ensure no username field is created and drop any existing username index
  strict: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  // Hash password if modified
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  
  // Update updatedAt if modified
  if (this.isModified() && !this.isNew) {
    this.updatedAt = Date.now();
  }
  
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  if (!this.password) {
    return false;
  }
  if (!candidatePassword) {
    return false;
  }
  return await bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model('User', userSchema);

export default User;

