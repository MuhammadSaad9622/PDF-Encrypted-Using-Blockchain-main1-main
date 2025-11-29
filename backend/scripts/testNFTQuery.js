import mongoose from 'mongoose';
import dotenv from 'dotenv';
import NFT from '../models/NFT.js';
import User from '../models/User.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/pdf-encryption';

async function testQuery() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Get the user
    const user = await User.findOne({ email: 'saad12378@gmail.com' });
    if (!user) {
      console.log('User not found');
      process.exit(1);
    }

    const userId = user._id.toString();
    const userIdObjectId = new mongoose.Types.ObjectId(userId);

    console.log(`\n🔍 Testing queries for userId: ${userId}`);
    console.log(`   ObjectId: ${userIdObjectId.toString()}`);

    // Test 1: Query by ObjectId
    const query1 = await NFT.find({ userId: userIdObjectId });
    console.log(`\n✅ Query by ObjectId: ${query1.length} NFTs`);

    // Test 2: Query by string
    const query2 = await NFT.find({ userId: userId });
    console.log(`✅ Query by string: ${query2.length} NFTs`);

    // Test 3: Query all and filter
    const allNFTs = await NFT.find({});
    const filtered = allNFTs.filter(nft => {
      if (!nft.userId) return false;
      return nft.userId.toString() === userId || nft.userId.toString() === userIdObjectId.toString();
    });
    console.log(`✅ Manual filter: ${filtered.length} NFTs`);

    // Test 4: Direct comparison
    console.log('\n📋 Checking each NFT:');
    allNFTs.forEach((nft, idx) => {
      if (nft.userId) {
        const matches = nft.userId.toString() === userId || nft.userId.equals(userIdObjectId);
        console.log(`   NFT ${nft.tokenId}: userId=${nft.userId.toString()}, matches=${matches}`);
      }
    });

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

testQuery();

