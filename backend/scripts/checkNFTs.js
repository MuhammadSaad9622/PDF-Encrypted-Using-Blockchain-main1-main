import mongoose from 'mongoose';
import dotenv from 'dotenv';
import NFT from '../models/NFT.js';
import User from '../models/User.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/pdf-encryption';

async function checkNFTs() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Get all NFTs
    const allNFTs = await NFT.find({}).sort({ createdAt: -1 });
    console.log(`\n📊 Total NFTs in database: ${allNFTs.length}`);

    if (allNFTs.length === 0) {
      console.log('No NFTs found in database');
      process.exit(0);
    }

    // Show NFT details
    console.log('\n📋 NFT Details:');
    allNFTs.forEach((nft, index) => {
      console.log(`\n${index + 1}. Token ID: ${nft.tokenId}`);
      console.log(`   userId: ${nft.userId ? (typeof nft.userId === 'string' ? nft.userId : nft.userId.toString()) : 'NULL'}`);
      console.log(`   recipientAddress: ${nft.recipientAddress}`);
      console.log(`   originalName: ${nft.originalName || 'null'}`);
      console.log(`   createdAt: ${nft.createdAt}`);
    });

    // Get all users
    const users = await User.find({}).select('email _id');
    console.log(`\n👥 Total users: ${users.length}`);
    users.forEach(user => {
      console.log(`   - ${user.email} (ID: ${user._id.toString()})`);
      
      // Count NFTs for this user
      const userNFTs = allNFTs.filter(nft => {
        if (!nft.userId) return false;
        const nftUserId = typeof nft.userId === 'string' ? nft.userId : nft.userId.toString();
        return nftUserId === user._id.toString();
      });
      console.log(`     NFTs: ${userNFTs.length}`);
    });

    // Check orphan NFTs
    const orphanNFTs = allNFTs.filter(nft => !nft.userId);
    console.log(`\n🔍 Orphan NFTs (no userId): ${orphanNFTs.length}`);
    if (orphanNFTs.length > 0) {
      orphanNFTs.forEach(nft => {
        console.log(`   - Token ${nft.tokenId}`);
      });
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkNFTs();

