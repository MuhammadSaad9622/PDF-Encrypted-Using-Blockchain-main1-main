import NFT from '../models/NFT.js';
import mongoose from 'mongoose';

/**
 * Get all NFTs for a user, with automatic orphan linking
 * This function ensures consistent NFT retrieval across all endpoints
 */
export const getUserNFTsFromDB = async (userId) => {
  try {
    // Convert userId to ObjectId (userId from JWT is always a string)
    const userIdObjectId = new mongoose.Types.ObjectId(userId);
    
    // First, get debug info about all NFTs
    const totalNFTs = await NFT.countDocuments({});
    const nftsWithUserId = await NFT.countDocuments({ userId: { $exists: true, $ne: null } });
    const orphanNFTs = await NFT.countDocuments({ 
      $or: [
        { userId: { $exists: false } },
        { userId: null }
      ]
    });
    
    console.log(`[NFT Utils] userId: ${userId}, Total NFTs: ${totalNFTs}, With userId: ${nftsWithUserId}, Orphans: ${orphanNFTs}`);
    
    // Try querying by ObjectId first (primary method)
    let nfts = await NFT.find({ userId: userIdObjectId }).sort({ createdAt: -1 });
    console.log(`[NFT Utils] Query by ObjectId (${userIdObjectId.toString()}) found: ${nfts.length} NFTs`);
    
    // Also try string format query (in case userId was stored as string)
    if (nfts.length === 0 && typeof userId === 'string') {
      nfts = await NFT.find({ userId: userId }).sort({ createdAt: -1 });
      console.log(`[NFT Utils] Query by string (${userId}) found: ${nfts.length} NFTs`);
    }
    
    // If still no results, query ALL NFTs and check their userIds manually (format mismatch check)
    if (nfts.length === 0 && totalNFTs > 0) {
      console.log(`[NFT Utils] Direct query returned 0, checking for format mismatches...`);
      const allNFTs = await NFT.find({}).sort({ createdAt: -1 });
      const matchingNFTs = allNFTs.filter(nft => {
        if (!nft.userId) return false;
        // Compare userIds in various formats
        const nftUserIdStr = nft.userId.toString();
        const queryUserIdStr = userIdObjectId.toString();
        
        return nftUserIdStr === queryUserIdStr || 
               nftUserIdStr === userId;
      });
      
      if (matchingNFTs.length > 0) {
        console.log(`[NFT Utils] Found ${matchingNFTs.length} NFTs by manual comparison`);
        nfts = matchingNFTs;
      } else {
        console.log(`[NFT Utils] No NFTs found for this user. User has ${nfts.length} NFTs.`);
      }
    }
    
    // DO NOT automatically link orphan NFTs - they should only be linked when minted by the user
    // Orphan NFTs might belong to other users or be from before userId tracking was added
    
    console.log(`[NFT Utils] Returning ${nfts.length} NFTs for userId ${userId}`);
    return nfts;
  } catch (error) {
    console.error('[NFT Utils] Error in getUserNFTsFromDB:', error);
    console.error('[NFT Utils] Error stack:', error.stack);
    throw error;
  }
};

