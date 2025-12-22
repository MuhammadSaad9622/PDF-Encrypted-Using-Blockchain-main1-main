import { nftService } from '../services/nftService.js';

/**
 * Get all NFTs for a user (using Supabase)
 * This function ensures consistent NFT retrieval across all endpoints
 */
export const getUserNFTsFromDB = async (userId) => {
  try {
    // userId is now a UUID from Supabase, not an ObjectId
    console.log(`[NFT Utils] Fetching NFTs for userId: ${userId} (UUID)`);
    
    // Get NFTs by userId (now using UUID)
    const nfts = await nftService.findByUserId(userId);
    
    console.log(`[NFT Utils] Found ${nfts.length} NFTs for userId ${userId}`);
    
    if (nfts.length > 0) {
      console.log(`[NFT Utils] Sample NFT: tokenId=${nfts[0].tokenId}, originalName=${nfts[0].originalName || 'null'}`);
    }
    
    return nfts;
  } catch (error) {
    console.error('[NFT Utils] Error in getUserNFTsFromDB:', error);
    console.error('[NFT Utils] Error stack:', error.stack);
    throw error;
  }
};

