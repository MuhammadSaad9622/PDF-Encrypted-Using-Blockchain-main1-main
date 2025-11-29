import User from '../models/User.js';
import jwt from 'jsonwebtoken';
import { ethers } from 'ethers';
import { contractAddress } from '../utils/wallet.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Generate JWT token
const generateToken = (userId, role = null) => {
  const payload = { userId };
  if (role === 'admin') {
    payload.role = 'admin';
  }
  return jwt.sign(payload, JWT_SECRET, { expiresIn: role === 'admin' ? '24h' : '7d' });
};

// Sign up
export const signup = async (req, res) => {
  try {
    const { email, password, name } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    // Normalize email (lowercase and trim)
    const normalizedEmail = email.toLowerCase().trim();

    // Check if user already exists (use normalized email)
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    // Create new user (use normalized email)
    const user = new User({
      email: normalizedEmail,
      password,
      name: name || ''
    });

    await user.save();

    // Generate token (convert _id to string)
    const token = generateToken(user._id.toString(), user.role);

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        walletAddress: user.walletAddress,
        role: user.role || 'user'
      }
    });
  } catch (error) {
    console.error('Signup error:', error);
    console.error('Error stack:', error.stack);
    
    // Handle MongoDB duplicate key error (unique index violation)
    if (error.code === 11000 || error.code === 11001) {
      const field = error.keyPattern ? Object.keys(error.keyPattern)[0] : 'email';
      // Map username to email for better error message
      const fieldName = field === 'username' ? 'email' : field;
      return res.status(400).json({ error: `User with this ${fieldName} already exists` });
    }
    
    // Handle MongoDB connection errors
    if (error.name === 'MongoServerError' || error.name === 'MongoNetworkError') {
      console.error('MongoDB connection error during signup:', error.message);
      return res.status(503).json({ error: 'Database connection error. Please try again.' });
    }
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      return res.status(400).json({ error: Object.values(error.errors).map(e => e.message).join(', ') });
    }
    

    res.status(500).json({
      error: error.message || 'Error creating user',

    });
  }
};

// Sign in
export const signin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Normalize email (lowercase and trim)
    const normalizedEmail = email.toLowerCase().trim();

    // Find user (use normalized email)
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Check if user has a password set
    if (!user.password) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Generate token (convert _id to string)
    // Include role in token for admin users
    const tokenPayload = { userId: user._id.toString() };
    if (user.role === 'admin') {
      tokenPayload.role = 'admin';
    }
    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: user.role === 'admin' ? '24h' : '7d' });

    res.status(200).json({
      success: true,
      token,
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        walletAddress: user.walletAddress,
        role: user.role || 'user'
      }
    });
  } catch (error) {
    console.error('Signin error:', error);
    res.status(500).json({ error: error.message || 'Error signing in' });
  }
};

// Get current user
export const getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-password');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.status(200).json({
      success: true,
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        walletAddress: user.walletAddress,
        profilePhoto: user.profilePhoto,
        bio: user.bio,
        phone: user.phone,
        location: user.location,
        address: user.address,
        city: user.city,
        country: user.country,
        zipCode: user.zipCode,
        website: user.website,
        company: user.company,
        jobTitle: user.jobTitle,
        role: user.role || 'user',
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
    });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({ error: error.message || 'Error fetching user' });
  }
};

// Get user invoices (platform subscription invoices, not NFT mints)
export const getUserInvoices = async (req, res) => {
  try {
    const userId = req.userId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const user = await User.findById(userId).select('email name');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get invoices from database for this user
    const Invoice = (await import('../models/Invoice.js')).default;
    const mongoose = (await import('mongoose')).default;
    const userIdObjectId = new mongoose.Types.ObjectId(userId);
    
    // Get all invoices for this user
    const invoices = await Invoice.find({ userId: userIdObjectId })
      .sort({ createdAt: -1 });

    // Apply pagination
    const paginatedInvoices = invoices.slice(skip, skip + limit);
    const total = invoices.length;
    const paidCount = invoices.filter(inv => inv.status === 'Paid').length;
    const pendingCount = invoices.filter(inv => inv.status === 'Pending').length;

    // Format invoices for frontend
    const formattedInvoices = paginatedInvoices.map((invoice) => ({
      id: invoice.invoiceId,
      subscriptionPlan: invoice.subscriptionPlan,
      amount: invoice.amount.toFixed(2),
      currency: invoice.currency,
      status: invoice.status,
      type: `Subscription - ${invoice.subscriptionPlan}`,
      createdAt: invoice.createdAt,
      transactionHash: invoice.transactionHash || 'N/A',
      description: invoice.description,
      subscriptionStartDate: invoice.subscriptionStartDate,
      subscriptionEndDate: invoice.subscriptionEndDate
    }));

    res.status(200).json({
      success: true,
      invoices: formattedInvoices,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      summary: {
        totalInvoices: total,
        paidInvoices: paidCount,
        pendingInvoices: pendingCount
      }
    });
  } catch (error) {
    console.error('Error fetching user invoices:', error);
    res.status(500).json({ error: error.message || 'Error fetching invoices' });
  }
};

// Update wallet address
export const updateWalletAddress = async (req, res) => {
  try {
    const { walletAddress } = req.body;

    if (!walletAddress) {
      return res.status(400).json({ error: 'Wallet address is required' });
    }

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    user.walletAddress = walletAddress;
    user.updatedAt = Date.now();
    await user.save();

    res.status(200).json({
      success: true,
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        walletAddress: user.walletAddress,
        profilePhoto: user.profilePhoto,
        bio: user.bio,
        phone: user.phone,
        location: user.location,
        address: user.address,
        city: user.city,
        country: user.country,
        zipCode: user.zipCode,
        website: user.website,
        company: user.company,
        jobTitle: user.jobTitle
      }
    });
  } catch (error) {
    console.error('Update wallet address error:', error);
    res.status(500).json({ error: error.message || 'Error updating wallet address' });
  }
};

// Update user profile
export const updateProfile = async (req, res) => {
  try {
    const { name, email, profilePhoto, bio, phone, location, address, city, country, zipCode, website, company, jobTitle } = req.body;

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update fields if provided
    if (name !== undefined) user.name = name;
    if (email !== undefined) {
      const normalizedEmail = email.toLowerCase().trim();
      // Check if email is already taken by another user
      const existingUser = await User.findOne({ email: normalizedEmail, _id: { $ne: req.userId } });
      if (existingUser) {
        return res.status(400).json({ error: 'Email is already taken' });
      }
      user.email = normalizedEmail;
    }
    if (profilePhoto !== undefined) user.profilePhoto = profilePhoto;
    if (bio !== undefined) user.bio = bio;
    if (phone !== undefined) user.phone = phone;
    if (location !== undefined) user.location = location;
    if (address !== undefined) user.address = address;
    if (city !== undefined) user.city = city;
    if (country !== undefined) user.country = country;
    if (zipCode !== undefined) user.zipCode = zipCode;
    if (website !== undefined) user.website = website;
    if (company !== undefined) user.company = company;
    if (jobTitle !== undefined) user.jobTitle = jobTitle;
    
    user.updatedAt = Date.now();
    await user.save();

    res.status(200).json({
      success: true,
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        walletAddress: user.walletAddress,
        profilePhoto: user.profilePhoto,
        bio: user.bio,
        phone: user.phone,
        location: user.location,
        address: user.address,
        city: user.city,
        country: user.country,
        zipCode: user.zipCode,
        website: user.website,
        company: user.company,
        jobTitle: user.jobTitle,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: error.message || 'Error updating profile' });
  }
};
