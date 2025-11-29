import User from '../models/User.js';
import { getUserNFTsFromDB } from '../utils/nftUtils.js';

// Get user statistics from database (no wallet/blockchain required)
export const getUserStats = async (req, res) => {
  try {
    const userId = req.userId;
    
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Verify user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Use the same helper function as getUserNFTs to get NFTs
    const nfts = await getUserNFTsFromDB(userId);
    const totalNFTs = nfts.length;
    
    console.log(`[Stats] getUserStats called for userId ${userId}`);
    console.log(`[Stats] Found ${totalNFTs} NFTs after helper function`);
    
    // If still 0, try one more time with a direct query to see what's in DB
    if (totalNFTs === 0) {
      const mongoose = (await import('mongoose')).default;
      const NFT = (await import('../models/NFT.js')).default;
      
      // Check total NFTs in database
      const allCount = await NFT.countDocuments({});
      console.log(`[Stats] Total NFTs in database: ${allCount}`);
      
      if (allCount > 0) {
        // Get a sample to see what userId format they have
        const sample = await NFT.find({}).limit(3).select('tokenId userId');
        console.log(`[Stats] Sample NFT userIds:`, sample.map(n => ({
          tokenId: n.tokenId,
          userId: n.userId ? (typeof n.userId === 'string' ? n.userId : n.userId.toString()) : 'null',
          userIdType: n.userId ? typeof n.userId : 'null'
        })));
      }
    }

    // Get recent NFTs (last 5) with file names from database
    // Since we already have originalName in the database, use it directly
    const recentNFTs = nfts.slice(0, 5).map((nft) => {
      // Log for debugging
      console.log(`[Stats] Processing NFT ${nft.tokenId}, originalName: ${nft.originalName || 'null'}`);
      
      // Use originalName from database, fallback to token ID format
      const pdfName = nft.originalName || `PDF #${nft.tokenId}`;
      
      console.log(`[Stats] NFT ${nft.tokenId} final pdfName: ${pdfName}`);
      
      return {
        tokenId: nft.tokenId,
        pdfName: pdfName,
        tokenURI: null
      };
    });
    
    console.log(`[Stats] Recent NFTs:`, recentNFTs.map(n => ({ tokenId: n.tokenId, pdfName: n.pdfName })));

    // Calculate monthly stats (last 6 months)
    const monthlyStats = [];
    const currentDate = new Date();
    const nftsByMonth = new Map();
    
    // Group NFTs by month
    nfts.forEach(nft => {
      const nftDate = new Date(nft.createdAt);
      const monthKey = `${nftDate.getFullYear()}-${nftDate.getMonth()}`;
      nftsByMonth.set(monthKey, (nftsByMonth.get(monthKey) || 0) + 1);
    });
    
    // Build monthly stats for last 6 months
    for (let i = 5; i >= 0; i--) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
      const monthName = date.toLocaleString('default', { month: 'short' });
      
      monthlyStats.push({
        month: `${monthName} ${date.getFullYear()}`,
        count: nftsByMonth.get(monthKey) || 0,
        monthIndex: date.getMonth(),
        year: date.getFullYear()
      });
    }

    res.status(200).json({
      success: true,
      stats: {
        totalPDFs: totalNFTs, // PDFs are stored as NFTs
        totalNFTs: totalNFTs,
        recentActivity: recentNFTs,
        monthlyStats: monthlyStats,
        walletAddress: null // No wallet required
      }
    });
  } catch (error) {
    console.error('Error fetching user stats:', error);
    res.status(500).json({ 
      error: error.message || 'Error fetching statistics',
      stats: {
        totalPDFs: 0,
        totalNFTs: 0,
        recentActivity: [],
        monthlyStats: []
      }
    });
  }
};

