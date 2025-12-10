import User from '../models/User.js';
import jwt from 'jsonwebtoken';
import { ethers } from 'ethers';
import { contractAddress } from '../utils/wallet.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Admin login
export const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check if user is admin
    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate admin token
    const token = jwt.sign(
      { userId: user._id.toString(), role: 'admin' },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(200).json({
      success: true,
      token,
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ error: error.message || 'Error during admin login' });
  }
};

// Get all users with pagination
export const getAllUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const skip = (page - 1) * limit;

    // Build search query
    const searchQuery = search
      ? {
          $or: [
            { email: { $regex: search, $options: 'i' } },
            { name: { $regex: search, $options: 'i' } },
            { walletAddress: { $regex: search, $options: 'i' } }
          ]
        }
      : {};

    // Get users with pagination
    const users = await User.find(searchQuery)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Get total count
    const total = await User.countDocuments(searchQuery);

    // Map users to ensure id is always a string
    const mappedUsers = users.map(user => ({
      id: user._id.toString(),
      email: user.email,
      name: user.name || '',
      walletAddress: user.walletAddress || null,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      role: user.role || 'user'
    }));

    res.status(200).json({
      success: true,
      users: mappedUsers,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: error.message || 'Error fetching users' });
  }
};

// Get user by ID
export const getUserById = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId)
      .select('-password')
      .populate('referredBy', 'name email referralCode');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get users referred by this user
    const referredUsers = await User.find({ referredBy: userId })
      .select('name email createdAt')
      .limit(10)
      .sort({ createdAt: -1 });

    const userObj = user.toObject();
    
    res.status(200).json({
      success: true,
      user: {
        id: userObj._id.toString(),
        email: userObj.email,
        name: userObj.name,
        walletAddress: userObj.walletAddress || null,
        createdAt: userObj.createdAt,
        accessCode: userObj.accessCode || null,
        referralCode: userObj.referralCode || null,
        referredBy: userObj.referredBy ? {
          id: userObj.referredBy._id?.toString() || userObj.referredBy.id,
          name: userObj.referredBy.name || '',
          email: userObj.referredBy.email || '',
          referralCode: userObj.referredBy.referralCode || ''
        } : null,
        referredUsers: referredUsers.map(u => ({
          id: u._id.toString(),
          name: u.name || '',
          email: u.email || '',
          createdAt: u.createdAt
        })),
        subscriptionPlan: userObj.subscriptionPlan || null,
        subscriptionStatus: userObj.subscriptionStatus || 'inactive',
        subscriptionStartDate: userObj.subscriptionStartDate || null,
        subscriptionEndDate: userObj.subscriptionEndDate || null,
        isSuspended: userObj.isSuspended || false,
        suspendedAt: userObj.suspendedAt || null,
        suspendedReason: userObj.suspendedReason || '',
        adminNotes: userObj.adminNotes || '',
        profileComplete: userObj.profileComplete || false,
        totalFileSizeUsed: userObj.totalFileSizeUsed || 0,
        fileSizeLimit: userObj.fileSizeLimit || (250 * 1024 * 1024)
      }
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: error.message || 'Error fetching user' });
  }
};

// Get user NFT details and PDF reports
export const getUserNFTDetails = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId).select('-password');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Import NFT model
    const NFT = (await import('../models/NFT.js')).default;
    const mongoose = (await import('mongoose')).default;

    // Query NFTs from database by userId (primary method)
    const userIdObjectId = new mongoose.Types.ObjectId(userId);
    const dbNFTs = await NFT.find({ userId: userIdObjectId })
      .sort({ createdAt: -1 });

    let nftCount = dbNFTs.length;
    let nfts = [];
    let pdfReports = [];

    // Calculate total file size used from NFTs
    let totalFileSizeUsed = 0;
    if (dbNFTs.length > 0) {
      totalFileSizeUsed = dbNFTs.reduce((sum, nft) => sum + (nft.fileSize || 0), 0);
      
      nfts = dbNFTs.map(nft => ({
        tokenId: nft.tokenId,
        tokenURI: nft.arweaveUrl || nft.supabaseUrl || `https://arweave.net/${nft.arweaveId}` || ''
      }));

      pdfReports = dbNFTs.map(nft => ({
        id: nft._id.toString(),
        tokenId: nft.tokenId,
        name: nft.originalName || `PDF Document #${nft.tokenId}`,
        mintedAt: nft.createdAt,
        fileSize: nft.fileSize ? `${(nft.fileSize / (1024 * 1024)).toFixed(2)} MB` : 'N/A',
        status: 'Active',
        metadataUrl: nft.arweaveUrl || nft.supabaseUrl || ''
      }));
    }
    
    // Use user's totalFileSizeUsed if available, otherwise calculate from NFTs
    const calculatedFileSizeUsed = user.totalFileSizeUsed !== undefined && user.totalFileSizeUsed !== null 
      ? user.totalFileSizeUsed 
      : totalFileSizeUsed;
    
    // Fallback: If no database NFTs found but user has wallet, check blockchain
    if (dbNFTs.length === 0 && user.walletAddress && contractAddress) {
      try {
        const provider = new ethers.JsonRpcProvider(
          process.env.POLYGON_MAINNET_RPC_URL || 'https://polygon-rpc.com'
        );

        const contract = new ethers.Contract(
          contractAddress,
          [
            'function balanceOf(address owner) view returns (uint256)',
            'function tokenOfOwnerByIndex(address owner, uint256 index) view returns (uint256)',
            'function tokenURI(uint256 tokenId) view returns (string)'
          ],
          provider
        );

        // Get total NFTs owned
        const balance = await contract.balanceOf(user.walletAddress);
        nftCount = Number(balance);

        // Get all NFTs owned by user
        for (let i = 0; i < nftCount; i++) {
          try {
            const tokenId = await contract.tokenOfOwnerByIndex(user.walletAddress, i);
            const tokenURI = await contract.tokenURI(tokenId);
            nfts.push({
              tokenId: tokenId.toString(),
              tokenURI: tokenURI
            });
          } catch (error) {
            console.error(`Error fetching NFT ${i}:`, error.message);
          }
        }

        // Generate PDF reports from blockchain data
        pdfReports = nfts.map((nft, index) => ({
          id: nft.tokenId,
          tokenId: nft.tokenId,
          name: `PDF Document #${nft.tokenId}`,
          mintedAt: user.createdAt,
          fileSize: 'N/A',
          status: 'Active',
          metadataUrl: nft.tokenURI
        }));
      } catch (error) {
        console.warn('Could not fetch NFT data from blockchain:', error.message);
      }
    }

    res.status(200).json({
      success: true,
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        walletAddress: user.walletAddress || null,
        createdAt: user.createdAt,
        accessCode: user.accessCode || null,
        referralCode: user.referralCode || null,
        subscriptionPlan: user.subscriptionPlan || null,
        subscriptionStatus: user.subscriptionStatus || 'inactive',
        subscriptionStartDate: user.subscriptionStartDate || null,
        subscriptionEndDate: user.subscriptionEndDate || null,
        isSuspended: user.isSuspended || false,
        suspendedAt: user.suspendedAt || null,
        suspendedReason: user.suspendedReason || '',
        adminNotes: user.adminNotes || '',
        totalFileSizeUsed: calculatedFileSizeUsed,
        fileSizeLimit: user.fileSizeLimit || (250 * 1024 * 1024) // Default 250MB
      },
      nftCount,
      nfts,
      pdfReports
    });
  } catch (error) {
    console.error('Error fetching user NFT details:', error);
    res.status(500).json({ error: error.message || 'Error fetching user NFT details' });
  }
};

// Get billing and invoices
export const getBillingInvoices = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // Get all users with wallets
    const users = await User.find({ walletAddress: { $ne: null } })
      .select('email name walletAddress createdAt')
      .sort({ createdAt: -1 });

    const provider = new ethers.JsonRpcProvider(
      process.env.POLYGON_MAINNET_RPC_URL || 'https://polygon-rpc.com'
    );

    // Generate invoices based on NFT mints
    const invoices = [];
    
    for (const user of users) {
      if (contractAddress) {
        try {
          const contract = new ethers.Contract(
            contractAddress,
            [
              'function balanceOf(address owner) view returns (uint256)',
              'function tokenOfOwnerByIndex(address owner, uint256 index) view returns (uint256)'
            ],
            provider
          );

          const balance = await contract.balanceOf(user.walletAddress);
          const nftCount = Number(balance);

          if (nftCount > 0) {
            // Create invoice for each NFT (in production, track actual transactions)
            for (let i = 0; i < nftCount; i++) {
              try {
                const tokenId = await contract.tokenOfOwnerByIndex(user.walletAddress, i);
                invoices.push({
                  id: `INV-${tokenId.toString()}-${user._id.toString()}`,
                  userId: user._id.toString(),
                  userEmail: user.email,
                  userName: user.name || 'N/A',
                  walletAddress: user.walletAddress,
                  tokenId: tokenId.toString(),
                  amount: '0.01', // Mock amount - in production, track actual costs
                  currency: 'MATIC',
                  status: 'Paid',
                  type: 'NFT Mint',
                  createdAt: user.createdAt,
                  transactionHash: 'N/A' // Would track actual tx hash
                });
              } catch (error) {
                console.error(`Error processing invoice for token ${i}:`, error.message);
              }
            }
          }
        } catch (error) {
          console.warn(`Could not fetch invoices for user ${user.email}:`, error.message);
        }
      }
    }

    // Sort by creation date (newest first)
    invoices.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Apply pagination
    const paginatedInvoices = invoices.slice(skip, skip + limit);
    const total = invoices.length;

    res.status(200).json({
      success: true,
      invoices: paginatedInvoices,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      summary: {
        totalInvoices: total,
        totalAmount: (total * 0.01).toFixed(2), // Mock calculation
        paidInvoices: total,
        pendingInvoices: 0
      }
    });
  } catch (error) {
    console.error('Error fetching billing invoices:', error);
    res.status(500).json({ error: error.message || 'Error fetching billing invoices' });
  }
};

// Update user
export const updateUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const updateData = req.body;

    // Don't allow updating password or role through this endpoint
    delete updateData.password;
    delete updateData.role;

    const user = await User.findByIdAndUpdate(
      userId,
      { ...updateData, updatedAt: Date.now() },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.status(200).json({
      success: true,
      user
    });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: error.message || 'Error updating user' });
  }
};

// Delete user
export const deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findByIdAndDelete(userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.status(200).json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: error.message || 'Error deleting user' });
  }
};

// Suspend user
export const suspendUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { reason } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.role === 'admin') {
      return res.status(403).json({ error: 'Cannot suspend admin users' });
    }

    user.isSuspended = true;
    user.suspendedAt = new Date();
    user.suspendedReason = reason || '';
    user.updatedAt = Date.now();
    await user.save();

    res.status(200).json({
      success: true,
      message: 'User suspended successfully',
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        isSuspended: user.isSuspended,
        suspendedAt: user.suspendedAt,
        suspendedReason: user.suspendedReason
      }
    });
  } catch (error) {
    console.error('Error suspending user:', error);
    res.status(500).json({ error: error.message || 'Error suspending user' });
  }
};

// Unsuspend user
export const unsuspendUser = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    user.isSuspended = false;
    user.suspendedAt = null;
    user.suspendedReason = '';
    user.updatedAt = Date.now();
    await user.save();

    res.status(200).json({
      success: true,
      message: 'User unsuspended successfully',
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        isSuspended: user.isSuspended
      }
    });
  } catch (error) {
    console.error('Error unsuspending user:', error);
    res.status(500).json({ error: error.message || 'Error unsuspending user' });
  }
};

// Update user notes
export const updateUserNotes = async (req, res) => {
  try {
    const { userId } = req.params;
    const { adminNotes } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Only update adminNotesUpdatedAt if notes actually changed
    const notesChanged = user.adminNotes !== (adminNotes || '');
    user.adminNotes = adminNotes || '';
    user.updatedAt = Date.now();
    if (notesChanged) {
      user.adminNotesUpdatedAt = new Date();
    }
    await user.save();

    res.status(200).json({
      success: true,
      message: 'User notes updated successfully',
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        adminNotes: user.adminNotes,
        adminNotesUpdatedAt: user.adminNotesUpdatedAt
      }
    });
  } catch (error) {
    console.error('Error updating user notes:', error);
    res.status(500).json({ error: error.message || 'Error updating user notes' });
  }
};

// Get analytics
export const getAnalytics = async (req, res) => {
  try {
    const provider = new ethers.JsonRpcProvider(
      process.env.POLYGON_MAINNET_RPC_URL || 'https://polygon-rpc.com'
    );

    // Get total users
    const totalUsers = await User.countDocuments();
    
    // Get users with wallets
    const usersWithWallets = await User.countDocuments({ walletAddress: { $ne: null } });
    
    // Get users created in last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const newUsersLast7Days = await User.countDocuments({ createdAt: { $gte: sevenDaysAgo } });
    
    // Get users created in last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const newUsersLast30Days = await User.countDocuments({ createdAt: { $gte: thirtyDaysAgo } });

    // Get user growth over time (last 12 months)
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
    
    const monthlyGrowth = await User.aggregate([
      {
        $match: {
          createdAt: { $gte: twelveMonthsAgo }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 }
      }
    ]);

    // Get NFT contract stats if contract address is available
    let totalNFTs = 0;
    if (contractAddress) {
      try {
        const contract = new ethers.Contract(
          contractAddress,
          ['function totalSupply() view returns (uint256)'],
          provider
        );
        totalNFTs = await contract.totalSupply();
        totalNFTs = parseInt(totalNFTs.toString());
      } catch (error) {
        console.warn('Could not fetch NFT total supply:', error.message);
      }
    }

    res.status(200).json({
      success: true,
      analytics: {
        users: {
          total: totalUsers,
          withWallets: usersWithWallets,
          withoutWallets: totalUsers - usersWithWallets,
          newLast7Days: newUsersLast7Days,
          newLast30Days: newUsersLast30Days,
          monthlyGrowth: monthlyGrowth.map(item => ({
            month: `${item._id.year}-${String(item._id.month).padStart(2, '0')}`,
            count: item.count
          }))
        },
        nfts: {
          total: totalNFTs
        },
        system: {
          contractAddress: contractAddress || 'Not deployed'
        }
      }
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ error: error.message || 'Error fetching analytics' });
  }
};

// Get dashboard stats
export const getDashboardStats = async (req, res) => {
  try {
    const provider = new ethers.JsonRpcProvider(
      process.env.POLYGON_MAINNET_RPC_URL || 'https://polygon-rpc.com'
    );

    // Get various stats
    const [
      totalUsers,
      usersWithWallets,
      newUsersToday,
      newUsersThisWeek,
      newUsersThisMonth
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ walletAddress: { $ne: null } }),
      User.countDocuments({
        createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) }
      }),
      User.countDocuments({
        createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
      }),
      User.countDocuments({
        createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
      })
    ]);

    // Get NFT count
    let totalNFTs = 0;
    if (contractAddress) {
      try {
        const contract = new ethers.Contract(
          contractAddress,
          ['function totalSupply() view returns (uint256)'],
          provider
        );
        totalNFTs = await contract.totalSupply();
        totalNFTs = parseInt(totalNFTs.toString());
      } catch (error) {
        console.warn('Could not fetch NFT total supply:', error.message);
      }
    }

    // Get recent users (last 10)
    const recentUsers = await User.find()
      .select('-password')
      .sort({ createdAt: -1 })
      .limit(10);

    res.status(200).json({
      success: true,
      stats: {
        overview: {
          totalUsers,
          usersWithWallets,
          usersWithoutWallets: totalUsers - usersWithWallets,
          totalNFTs
        },
        growth: {
          today: newUsersToday,
          thisWeek: newUsersThisWeek,
          thisMonth: newUsersThisMonth
        },
        recentUsers: recentUsers.map(user => ({
          id: user._id.toString(),
          email: user.email,
          name: user.name,
          walletAddress: user.walletAddress,
          createdAt: user.createdAt
        }))
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ error: error.message || 'Error fetching dashboard stats' });
  }
};
