import mongoose from 'mongoose';

const invoiceSchema = new mongoose.Schema({
  invoiceId: {
    type: String,
    required: true,
    unique: true
  },
  invoiceNumber: {
    type: String,
    unique: true,
    sparse: true // Only enforce uniqueness for non-null values
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  subscriptionPlan: {
    type: String,
    enum: ['basic', 'monthly', 'yearly', 'lifetime'],
    default: 'basic'
  },
  amount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: 'USD'
  },
  status: {
    type: String,
    enum: ['Paid', 'Pending', 'Failed', 'Cancelled'],
    default: 'Pending'
  },
  transactionHash: {
    type: String,
    default: null
  },
  paymentMethod: {
    type: String,
    default: 'blockchain'
  },
  squarePaymentId: {
    type: String,
    default: null,
    index: true
  },
  squareOrderId: {
    type: String,
    default: null
  },
  subscriptionStartDate: {
    type: Date,
    default: Date.now
  },
  subscriptionEndDate: {
    type: Date,
    default: null
  },
  description: {
    type: String,
    default: 'Platform Subscription'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Create indexes
invoiceSchema.index({ userId: 1, createdAt: -1 });
// Note: invoiceId index is automatically created by unique: true

const Invoice = mongoose.model('Invoice', invoiceSchema);

export default Invoice;

