import { userService } from '../services/userService.js';
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
    const user = await userService.findByEmail(normalizedEmail);

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check if user is admin
    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
    }

    // Check password
    const isPasswordValid = await userService.comparePassword(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate admin token
    const token = jwt.sign(
      { userId: user.id, role: 'admin' },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(200).json({
      success: true,
      token,
      user: {
        id: user.id,
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
    const users = await userService.find(searchQuery, {
      sort: { createdAt: -1 },
      skip,
      limit
    });

    // Get total count
    const total = await userService.count(searchQuery);

    // Map users to ensure id is always a string (remove password)
    const mappedUsers = users.map(user => {
      const { password, ...userWithoutPassword } = user;
      return {
        id: user.id,
        email: user.email,
        name: user.name || null, // Return null instead of empty string
        walletAddress: user.walletAddress || null,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        role: user.role || 'user'
      };
    });

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
    const user = await userService.findById(userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get users referred by this user
    const referredUsers = await userService.findByReferredBy(userId);
    const limitedReferredUsers = referredUsers.slice(0, 10);

    // Get referredBy user if exists
    let referredByUser = null;
    if (user.referredBy) {
      referredByUser = await userService.findById(user.referredBy);
    }
    
    res.status(200).json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        walletAddress: user.walletAddress || null,
        createdAt: user.createdAt,
        accessCode: user.accessCode || null,
        referralCode: user.referralCode || null,
        referredBy: referredByUser ? {
          id: referredByUser.id,
          name: referredByUser.name || '',
          email: referredByUser.email || '',
          referralCode: referredByUser.referralCode || ''
        } : null,
        referredUsers: limitedReferredUsers.map(u => ({
          id: u.id,
          name: u.name || '',
          email: u.email || '',
          createdAt: u.createdAt
        })),
        subscriptionPlan: user.subscriptionPlan || null,
        subscriptionStatus: user.subscriptionStatus || 'inactive',
        subscriptionStartDate: user.subscriptionStartDate || null,
        subscriptionEndDate: user.subscriptionEndDate || null,
        isSuspended: user.isSuspended || false,
        suspendedAt: user.suspendedAt || null,
        suspendedReason: user.suspendedReason || '',
        adminNotes: user.adminNotes || '',
        profileComplete: user.profileComplete || false,
        totalFileSizeUsed: user.totalFileSizeUsed || 0,
        fileSizeLimit: user.fileSizeLimit || (250 * 1024 * 1024)
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
    const user = await userService.findById(userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Import NFT service (now using Supabase)
    const { nftService } = await import('../services/nftService.js');

    // Query NFTs from database by userId (now using UUID)
    const dbNFTs = await nftService.findByUserId(userId);

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
        id: nft.id,
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
        id: user.id,
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

    // Import invoice service
    const { invoiceService } = await import('../services/invoiceService.js');

    // Fetch all invoices from Supabase with pagination
    const invoices = await invoiceService.find({}, {
      sort: { createdAt: -1 },
      skip,
      limit
    });

    // Get total count for pagination
    const total = await invoiceService.count({});

    // Fetch user information for each invoice
    const invoicesWithUserInfo = await Promise.all(
      invoices.map(async (invoice) => {
        const user = await userService.findById(invoice.userId);
        if (!user) {
          // If user not found, return invoice with minimal info
          return {
            id: invoice.id,
            invoiceId: invoice.invoiceId,
            userId: invoice.userId,
            userEmail: 'Unknown',
            userName: 'Unknown User',
            walletAddress: null,
            tokenId: invoice.subscriptionPlan || 'N/A', // Use subscription plan as identifier
            amount: typeof invoice.amount === 'number' ? invoice.amount.toFixed(2) : parseFloat(invoice.amount || 0).toFixed(2),
            currency: invoice.currency || 'USD',
            status: invoice.status || 'Pending',
            type: invoice.subscriptionPlan ? `Subscription - ${invoice.subscriptionPlan}` : 'Invoice',
            createdAt: invoice.createdAt,
            transactionHash: invoice.transactionHash || 'N/A'
          };
        }

        // Helper function to get display name (same as frontend)
        const getDisplayName = (user) => {
          const userName = user.name?.trim();
          if (userName && userName !== '') {
            return userName;
          }
          if (user.email) {
            const emailPart = user.email.split('@')[0];
            return emailPart
              .replace(/[._-]/g, ' ')
              .split(' ')
              .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
              .join(' ');
          }
          return 'User';
        };

        return {
          id: invoice.id,
          invoiceId: invoice.invoiceId,
          userId: invoice.userId,
          userEmail: user.email,
          userName: getDisplayName(user),
          walletAddress: user.walletAddress || null,
          tokenId: invoice.subscriptionPlan || 'N/A', // Use subscription plan as identifier
          amount: typeof invoice.amount === 'number' ? invoice.amount.toFixed(2) : parseFloat(invoice.amount || 0).toFixed(2),
          currency: invoice.currency || 'USD',
          status: invoice.status || 'Pending',
          type: invoice.subscriptionPlan ? `Subscription - ${invoice.subscriptionPlan}` : 'Invoice',
          createdAt: invoice.createdAt,
          transactionHash: invoice.transactionHash || 'N/A'
        };
      })
    );

    // Calculate summary statistics
    const allInvoices = await invoiceService.find({}); // Get all for summary
    const totalAmount = allInvoices.reduce((sum, inv) => {
      const amount = typeof inv.amount === 'number' ? inv.amount : parseFloat(inv.amount || 0);
      return sum + amount;
    }, 0);
    const paidInvoices = allInvoices.filter(inv => inv.status === 'Paid' || inv.status === 'paid').length;
    const pendingInvoices = allInvoices.filter(inv => inv.status === 'Pending' || inv.status === 'pending').length;

    res.status(200).json({
      success: true,
      invoices: invoicesWithUserInfo,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      summary: {
        totalInvoices: total,
        totalAmount: totalAmount.toFixed(2),
        paidInvoices,
        pendingInvoices
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

    const user = await userService.update(userId, updateData);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Remove password from response
    const { password, ...userWithoutPassword } = user;

    res.status(200).json({
      success: true,
      user: userWithoutPassword
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

    const user = await userService.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Prevent deleting admin users
    if (user.role === 'admin') {
      return res.status(403).json({ error: 'Cannot delete admin users' });
    }

    // Import services for related data
    const { invoiceService } = await import('../services/invoiceService.js');
    const { nftService } = await import('../services/nftService.js');
    const { accessCodeService } = await import('../services/accessCodeService.js');
    const supabase = (await import('../utils/supabase.js')).default;

    if (!supabase) {
      return res.status(500).json({ error: 'Supabase is not configured' });
    }

    // Delete or handle related records before deleting user
    
    // 1. Delete user's invoices
    try {
      const userInvoices = await invoiceService.findByUserId(userId);
      if (userInvoices && userInvoices.length > 0) {
        for (const invoice of userInvoices) {
          await supabase.from('invoices').delete().eq('id', invoice.id);
        }
        console.log(`Deleted ${userInvoices.length} invoices for user ${userId}`);
      }
    } catch (invoiceError) {
      console.warn('Error deleting invoices:', invoiceError.message);
      // Continue with deletion even if invoices fail
    }

    // 2. Delete user's NFTs (or set user_id to null if you want to keep NFTs)
    try {
      const userNFTs = await nftService.findByUserId(userId);
      if (userNFTs && userNFTs.length > 0) {
        for (const nft of userNFTs) {
          // Option 1: Delete NFTs
          await supabase.from('nfts').delete().eq('id', nft.id);
          // Option 2: Keep NFTs but remove user link (uncomment if preferred)
          // await nftService.update(nft.id, { user_id: null });
        }
        console.log(`Deleted ${userNFTs.length} NFTs for user ${userId}`);
      }
    } catch (nftError) {
      console.warn('Error deleting NFTs:', nftError.message);
      // Continue with deletion even if NFTs fail
    }

    // 3. Delete access codes created by this user
    try {
      const userAccessCodes = await accessCodeService.find({ createdBy: userId });
      if (userAccessCodes && userAccessCodes.length > 0) {
        for (const code of userAccessCodes) {
          await accessCodeService.delete(code.id);
        }
        console.log(`Deleted ${userAccessCodes.length} access codes created by user ${userId}`);
      }
    } catch (accessCodeError) {
      console.warn('Error deleting access codes:', accessCodeError.message);
      // Continue with deletion even if access codes fail
    }

    // 4. Update users that were referred by this user (set referred_by to null)
    try {
      const referredUsers = await userService.findByReferredBy(userId);
      if (referredUsers && referredUsers.length > 0) {
        for (const referredUser of referredUsers) {
          await userService.update(referredUser.id, { referredBy: null });
        }
        console.log(`Updated ${referredUsers.length} users that were referred by user ${userId}`);
      }
    } catch (referralError) {
      console.warn('Error updating referral relationships:', referralError.message);
      // Continue with deletion even if referral updates fail
    }

    // 5. Now delete the user
    await userService.delete(userId);

    res.status(200).json({
      success: true,
      message: 'User and all related data deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    
    // Provide helpful error message for foreign key violations
    if (error.code === '23503') {
      return res.status(400).json({ 
        error: 'Cannot delete user: User still has related records. Please contact support if this error persists.' 
      });
    }
    
    res.status(500).json({ error: error.message || 'Error deleting user' });
  }
};

// Suspend user
export const suspendUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { reason } = req.body;

    const user = await userService.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.role === 'admin') {
      return res.status(403).json({ error: 'Cannot suspend admin users' });
    }

    const updatedUser = await userService.update(userId, {
      isSuspended: true,
      suspendedAt: new Date(),
      suspendedReason: reason || ''
    });

    res.status(200).json({
      success: true,
      message: 'User suspended successfully',
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        isSuspended: updatedUser.isSuspended,
        suspendedAt: updatedUser.suspendedAt,
        suspendedReason: updatedUser.suspendedReason
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

    const user = await userService.update(userId, {
      isSuspended: false,
      suspendedAt: null,
      suspendedReason: ''
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.status(200).json({
      success: true,
      message: 'User unsuspended successfully',
      user: {
        id: user.id,
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

    const existingUser = await userService.findById(userId);
    if (!existingUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Only update adminNotesUpdatedAt if notes actually changed
    const notesChanged = existingUser.adminNotes !== (adminNotes || '');
    const updateData = {
      adminNotes: adminNotes || ''
    };
    if (notesChanged) {
      updateData.adminNotesUpdatedAt = new Date();
    }

    const user = await userService.update(userId, updateData);

    res.status(200).json({
      success: true,
      message: 'User notes updated successfully',
      user: {
        id: user.id,
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
    const totalUsers = await userService.count();
    
    // Get users with wallets (filter after fetching since Supabase doesn't support $ne)
    const allUsers = await userService.find({});
    const usersWithWallets = allUsers.filter(u => u.walletAddress !== null && u.walletAddress !== '').length;
    
    // Get users created in last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const allUsers7Days = await userService.find({});
    const newUsersLast7Days = allUsers7Days.filter(u => new Date(u.createdAt) >= sevenDaysAgo).length;
    
    // Get users created in last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const allUsers30Days = await userService.find({});
    const newUsersLast30Days = allUsers30Days.filter(u => new Date(u.createdAt) >= thirtyDaysAgo).length;

    // Get user growth over time (last 12 months)
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
    
    // Group by month manually since Supabase doesn't have aggregate
    const allUsers12Months = await userService.find({});
    const filteredUsers = allUsers12Months.filter(u => new Date(u.createdAt) >= twelveMonthsAgo);
    const monthlyGrowthMap = {};
    
    filteredUsers.forEach(user => {
      const date = new Date(user.createdAt);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthlyGrowthMap[key] = (monthlyGrowthMap[key] || 0) + 1;
    });
    
    const monthlyGrowth = Object.entries(monthlyGrowthMap)
      .map(([month, count]) => ({ month, count }))
      .sort((a, b) => a.month.localeCompare(b.month));

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
          monthlyGrowth: monthlyGrowth
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
    const allUsers = await userService.find({});
    const totalUsers = allUsers.length;
    const usersWithWallets = allUsers.filter(u => u.walletAddress !== null && u.walletAddress !== '').length;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const newUsersToday = allUsers.filter(u => new Date(u.createdAt) >= today).length;
    
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const newUsersThisWeek = allUsers.filter(u => new Date(u.createdAt) >= weekAgo).length;
    
    const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const newUsersThisMonth = allUsers.filter(u => new Date(u.createdAt) >= monthAgo).length;

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
    const recentUsers = await userService.find({}, {
      sort: { createdAt: -1 },
      limit: 10
    });

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
        recentUsers: recentUsers.map(user => {
          const { password, ...userWithoutPassword } = user;
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            walletAddress: user.walletAddress,
            createdAt: user.createdAt
          };
        })
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ error: error.message || 'Error fetching dashboard stats' });
  }
};
