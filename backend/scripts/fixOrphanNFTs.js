import mongoose from 'mongoose';
import dotenv from 'dotenv';
import NFT from '../models/NFT.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/pdf-encryption';

async function fixOrphanNFTs() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find the new user who incorrectly got orphan NFTs
    const newUserId = '692b3e574b1b5f09df2ab9c1'; // saad909089@gmail.com
    
    // Get NFTs that belong to this user
    const userNFTs = await NFT.find({ userId: new mongoose.Types.ObjectId(newUserId) });
    console.log(`\nFound ${userNFTs.length} NFTs for user ${newUserId}`);
    
    // These are the orphan NFTs (72, 71, 70, 69, 68) that were incorrectly linked
    // They should NOT have a userId since they were created before userId tracking
    // Unlink them by setting userId to null
    const orphanTokenIds = ['72', '71', '70', '69', '68'];
    
    console.log('\nUnlinking orphan NFTs (tokens 72, 71, 70, 69, 68) from new user...');
    
    const result = await NFT.updateMany(
      { 
        tokenId: { $in: orphanTokenIds },
        userId: new mongoose.Types.ObjectId(newUserId)
      },
      { $unset: { userId: "" } }
    );
    
    console.log(`✅ Unlinked ${result.modifiedCount} orphan NFTs`);
    
    // Verify
    const remainingNFTs = await NFT.find({ userId: new mongoose.Types.ObjectId(newUserId) });
    console.log(`\nRemaining NFTs for this user: ${remainingNFTs.length}`);
    
    // Check orphan NFTs
    const orphanNFTs = await NFT.find({ 
      $or: [
        { userId: { $exists: false } },
        { userId: null }
      ]
    });
    console.log(`Orphan NFTs (no userId): ${orphanNFTs.length}`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

fixOrphanNFTs();

