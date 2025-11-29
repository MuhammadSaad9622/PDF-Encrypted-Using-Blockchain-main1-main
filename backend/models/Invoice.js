import mongoose from 'mongoose';

const invoiceSchema = new mongoose.Schema({
  invoiceId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  subscriptionPlan: {
    type: String,
    enum: ['monthly', 'yearly', 'lifetime'],
    default: 'monthly'
  },
  amount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: 'MATIC'
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
invoiceSchema.index({ invoiceId: 1 });

const Invoice = mongoose.model('Invoice', invoiceSchema);

export default Invoice;

