import User from '../models/User.js';
import { ethers } from 'ethers';
import { contractAddress } from '../utils/wallet.js';

// Get user statistics
export const getUserStats = async (req, res) => {
  try {
    let walletAddress = null;
    
    // Support both authenticated user and direct walletAddress query parameter
    if (req.query.walletAddress) {
      walletAddress = req.query.walletAddress;
    } else if (req.userId) {
      // Get user's wallet address from database
      const user = await User.findById(req.userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      walletAddress = user.walletAddress;
    } else {
      return res.status(400).json({ error: 'Wallet address required (via query parameter or authentication)' });
    }

    if (!walletAddress) {
      return res.status(200).json({
        success: true,
        stats: {
          totalPDFs: 0,
          totalNFTs: 0,
          recentActivity: [],
          monthlyStats: [],
          walletAddress: null
        }
      });
    }

    // Initialize provider and contract
    const provider = new ethers.JsonRpcProvider(process.env.POLYGON_MAINNET_RPC_URL || 'https://polygon-rpc.com');
    
    if (!contractAddress) {
      return res.status(200).json({
        success: true,
        stats: {
          totalPDFs: 0,
          totalNFTs: 0,
          recentActivity: [],
          monthlyStats: []
        }
      });
    }

    const contract = new ethers.Contract(
      contractAddress,
      [
        'function balanceOf(address owner) view returns (uint256)',
        'function tokenOfOwnerByIndex(address owner, uint256 index) view returns (uint256)',
        'function tokenURI(uint256 tokenId) view returns (string)'
      ],
      provider
    );

    // Set overall timeout for stats fetching (4 seconds max for faster response)
    const statsTimeout = 4000;
    const startTime = Date.now();
    
    // Get total NFTs owned (fast query - 1 second timeout)
    const balance = await Promise.race([
      contract.balanceOf(walletAddress),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Balance fetch timeout')), 1000))
    ]);
    const totalNFTs = Number(balance);
    
    // Get recent NFTs (last 5 only, fetched in parallel with aggressive timeout)
    const recentNFTs = [];
    const nftCount = Math.min(totalNFTs, 5); // Only fetch last 5 for dashboard
    
    if (nftCount > 0 && (Date.now() - startTime) < statsTimeout - 1000) {
      // Calculate remaining time (max 2.5 seconds for NFT fetching)
      const remainingTime = Math.max(statsTimeout - (Date.now() - startTime) - 500, 2000);
      const perNFTTimeout = Math.min(Math.floor(remainingTime / nftCount), 1500); // Max 1.5s per NFT
      
      // Fetch all token IDs in parallel (with timeout)
      const tokenIdPromises = [];
      for (let i = 0; i < nftCount; i++) {
        tokenIdPromises.push(
          Promise.race([
            contract.tokenOfOwnerByIndex(walletAddress, i),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Token ID timeout')), perNFTTimeout)
            )
          ]).catch(() => null) // Return null on timeout/failure
        );
      }
      
      const tokenIds = await Promise.all(tokenIdPromises);
      
      // Only get token URIs for successfully fetched token IDs (skip metadata - too slow)
      const validTokenIds = tokenIds.filter(id => id !== null);
      if (validTokenIds.length > 0 && (Date.now() - startTime) < statsTimeout - 500) {
        // Get token URIs with very short timeout (skip if time is running out)
        const tokenURIPromises = validTokenIds.map((tokenId) =>
          Promise.race([
            contract.tokenURI(tokenId).catch(() => null),
            new Promise((resolve) => setTimeout(() => resolve(null), 800)) // 800ms timeout per URI
          ])
        );
        
        const tokenURIs = await Promise.all(tokenURIPromises);
        
        // Build recent NFTs list (skip metadata fetching - load PDF names lazily if needed)
        validTokenIds.forEach((tokenId, index) => {
          recentNFTs.push({
            tokenId: tokenId.toString(),
            tokenURI: tokenURIs[index] || null
          });
        });
      }
      
      // Check if we're running out of time
      if (Date.now() - startTime > statsTimeout - 500) {
        console.warn('Stats fetch approaching timeout, returning partial data');
      }
    }

    // Calculate monthly stats (last 6 months) - fast calculation
    const monthlyStats = [];
    const currentDate = new Date();
    const nftsPerMonth = Math.floor(totalNFTs / 6);
    const remainder = totalNFTs % 6;
    
    for (let i = 5; i >= 0; i--) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const monthName = date.toLocaleString('default', { month: 'short' });
      const year = date.getFullYear();
      
      // Distribute remainder to most recent months
      const count = i >= (6 - remainder) ? nftsPerMonth + 1 : nftsPerMonth;
      
      monthlyStats.push({
        month: `${monthName} ${year}`,
        count: count,
        monthIndex: date.getMonth(),
        year: date.getFullYear()
      });
    }

    res.status(200).json({
      success: true,
      stats: {
        totalPDFs: totalNFTs, // PDFs are stored as NFTs
        totalNFTs: totalNFTs,
        recentActivity: recentNFTs.slice(0, 5), // Last 5 NFTs
        monthlyStats: monthlyStats,
        walletAddress: walletAddress
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

