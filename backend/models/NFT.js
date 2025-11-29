import mongoose from 'mongoose';

const nftSchema = new mongoose.Schema({
  tokenId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  encryptionKey: {
    type: String, // JSON string of {key, iv}
    required: true
  },
  supabasePath: {
    type: String,
    default: null
  },
  supabaseUrl: {
    type: String,
    default: null
  },
  arweaveId: {
    type: String,
    default: null
  },
  arweaveUrl: {
    type: String,
    default: null
  },
  recipientAddress: {
    type: String,
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false, // Optional for backward compatibility
    index: true
  },
  originalName: {
    type: String,
    default: null // Store original file name
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Create index on tokenId for fast lookups
nftSchema.index({ tokenId: 1 });

const NFT = mongoose.model('NFT', nftSchema);

export default NFT;

