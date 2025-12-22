import supabase from '../utils/supabase.js';
import bcrypt from 'bcryptjs';

// Helper to convert Supabase user to app format
const mapSupabaseUser = (user) => {
  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    password: user.password, // Keep for password comparison
    walletAddress: user.wallet_address,
    name: user.name || null, // Return null instead of empty string for consistency
    profilePhoto: user.profile_photo,
    bio: user.bio,
    phone: user.phone,
    location: user.location,
    address: user.address,
    city: user.city,
    country: user.country,
    zipCode: user.zip_code,
    website: user.website,
    company: user.company,
    jobTitle: user.job_title,
    role: user.role || 'user',
    subscriptionStatus: user.subscription_status || 'inactive',
    subscriptionStartDate: user.subscription_start_date,
    subscriptionEndDate: user.subscription_end_date,
    totalFileSizeUsed: user.total_file_size_used || 0,
    fileSizeLimit: user.file_size_limit || 250 * 1024 * 1024,
    lastSubscriptionInvoiceId: user.last_subscription_invoice_id,
    accessCode: user.access_code,
    referredBy: user.referred_by,
    referralCode: user.referral_code,
    agreedToTerms: user.agreed_to_terms,
    agreedToPrivacy: user.agreed_to_privacy,
    agreedToEarlyAdopter: user.agreed_to_early_adopter,
    agreementDates: user.agreement_dates || {},
    profileComplete: user.profile_complete,
    state: user.state,
    province: user.province,
    adminNotes: user.admin_notes,
    adminNotesUpdatedAt: user.admin_notes_updated_at,
    adminNotesLastReadAt: user.admin_notes_last_read_at,
    isSuspended: user.is_suspended,
    suspendedAt: user.suspended_at,
    suspendedReason: user.suspended_reason,
    subscriptionPlan: user.subscription_plan,
    createdAt: user.created_at,
    updatedAt: user.updated_at
  };
};

// Helper to convert app user format to Supabase format
const mapToSupabaseUser = (user) => {
  const supabaseUser = {};
  
  if (user.email !== undefined) supabaseUser.email = user.email;
  if (user.password !== undefined) supabaseUser.password = user.password;
  if (user.walletAddress !== undefined) supabaseUser.wallet_address = user.walletAddress;
  if (user.name !== undefined) supabaseUser.name = user.name;
  if (user.profilePhoto !== undefined) supabaseUser.profile_photo = user.profilePhoto;
  if (user.bio !== undefined) supabaseUser.bio = user.bio;
  if (user.phone !== undefined) supabaseUser.phone = user.phone;
  if (user.location !== undefined) supabaseUser.location = user.location;
  if (user.address !== undefined) supabaseUser.address = user.address;
  if (user.city !== undefined) supabaseUser.city = user.city;
  if (user.country !== undefined) supabaseUser.country = user.country;
  if (user.zipCode !== undefined) supabaseUser.zip_code = user.zipCode;
  if (user.website !== undefined) supabaseUser.website = user.website;
  if (user.company !== undefined) supabaseUser.company = user.company;
  if (user.jobTitle !== undefined) supabaseUser.job_title = user.jobTitle;
  if (user.role !== undefined) supabaseUser.role = user.role;
  if (user.subscriptionStatus !== undefined) supabaseUser.subscription_status = user.subscriptionStatus;
  if (user.subscriptionStartDate !== undefined) supabaseUser.subscription_start_date = user.subscriptionStartDate;
  if (user.subscriptionEndDate !== undefined) supabaseUser.subscription_end_date = user.subscriptionEndDate;
  if (user.totalFileSizeUsed !== undefined) supabaseUser.total_file_size_used = user.totalFileSizeUsed;
  if (user.fileSizeLimit !== undefined) supabaseUser.file_size_limit = user.fileSizeLimit;
  if (user.lastSubscriptionInvoiceId !== undefined) supabaseUser.last_subscription_invoice_id = user.lastSubscriptionInvoiceId;
  if (user.accessCode !== undefined) supabaseUser.access_code = user.accessCode;
  if (user.referredBy !== undefined) supabaseUser.referred_by = user.referredBy;
  if (user.referralCode !== undefined) supabaseUser.referral_code = user.referralCode;
  if (user.agreedToTerms !== undefined) supabaseUser.agreed_to_terms = user.agreedToTerms;
  if (user.agreedToPrivacy !== undefined) supabaseUser.agreed_to_privacy = user.agreedToPrivacy;
  if (user.agreedToEarlyAdopter !== undefined) supabaseUser.agreed_to_early_adopter = user.agreedToEarlyAdopter;
  if (user.agreementDates !== undefined) supabaseUser.agreement_dates = user.agreementDates;
  if (user.profileComplete !== undefined) supabaseUser.profile_complete = user.profileComplete;
  if (user.state !== undefined) supabaseUser.state = user.state;
  if (user.province !== undefined) supabaseUser.province = user.province;
  if (user.adminNotes !== undefined) supabaseUser.admin_notes = user.adminNotes;
  if (user.adminNotesUpdatedAt !== undefined) supabaseUser.admin_notes_updated_at = user.adminNotesUpdatedAt;
  if (user.adminNotesLastReadAt !== undefined) supabaseUser.admin_notes_last_read_at = user.adminNotesLastReadAt;
  if (user.isSuspended !== undefined) supabaseUser.is_suspended = user.isSuspended;
  if (user.suspendedAt !== undefined) supabaseUser.suspended_at = user.suspendedAt;
  if (user.suspendedReason !== undefined) supabaseUser.suspended_reason = user.suspendedReason;
  if (user.subscriptionPlan !== undefined) supabaseUser.subscription_plan = user.subscriptionPlan;
  
  return supabaseUser;
};

export const userService = {
  // Find user by email
  findByEmail: async (email) => {
    if (!supabase) {
      throw new Error('Supabase is not configured. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your .env file');
    }
    
    const normalizedEmail = email.toLowerCase().trim();
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', normalizedEmail)
      .single();
    
    if (error && error.code !== 'PGRST116') { // PGRST116 = not found
      throw error;
    }
    
    return mapSupabaseUser(data);
  },

  // Find user by ID
  findById: async (id) => {
    if (!supabase) {
      throw new Error('Supabase is not configured. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your .env file');
    }
    
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error && error.code !== 'PGRST116') {
      throw error;
    }
    
    return mapSupabaseUser(data);
  },

  // Find user by referral code
  findByReferralCode: async (referralCode) => {
    if (!supabase) {
      throw new Error('Supabase is not configured. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your .env file');
    }
    
    const normalizedCode = referralCode.toUpperCase().trim();
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('referral_code', normalizedCode)
      .single();
    
    if (error && error.code !== 'PGRST116') {
      throw error;
    }
    
    return mapSupabaseUser(data);
  },

  // Create new user
  create: async (userData) => {
    if (!supabase) {
      throw new Error('Supabase is not configured. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your .env file');
    }
    
    // Hash password before saving
    const hashedPassword = await bcrypt.hash(userData.password, 10);
    
    const supabaseUser = mapToSupabaseUser({
      ...userData,
      password: hashedPassword
    });
    
    // Normalize email
    if (supabaseUser.email) {
      supabaseUser.email = supabaseUser.email.toLowerCase().trim();
    }
    
    const { data, error } = await supabase
      .from('users')
      .insert([supabaseUser])
      .select()
      .single();
    
    if (error) {
      // Handle unique constraint violations
      if (error.code === '23505') { // Unique violation
        const field = error.message.includes('email') ? 'email' : 'referral_code';
        const duplicateError = new Error(`User with this ${field} already exists`);
        duplicateError.code = 11000; // MongoDB duplicate key error code for compatibility
        throw duplicateError;
      }
      throw error;
    }
    
    return mapSupabaseUser(data);
  },

  // Update user
  update: async (id, updateData) => {
    if (!supabase) {
      throw new Error('Supabase is not configured. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your .env file');
    }
    
    const supabaseUpdate = mapToSupabaseUser(updateData);
    
    // Hash password if provided
    if (supabaseUpdate.password) {
      supabaseUpdate.password = await bcrypt.hash(supabaseUpdate.password, 10);
    }
    
    // Normalize email if provided
    if (supabaseUpdate.email) {
      supabaseUpdate.email = supabaseUpdate.email.toLowerCase().trim();
    }

    const { data, error } = await supabase
      .from('users')
      .update(supabaseUpdate)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      if (error.code === '23505') {
        const field = error.message.includes('email') ? 'email' : 'referral_code';
        const duplicateError = new Error(`User with this ${field} already exists`);
        duplicateError.code = 11000;
        throw duplicateError;
      }
      throw error;
    }
    
    return mapSupabaseUser(data);
  },

  // Find users with filters (for admin)
  find: async (query = {}, options = {}) => {
    if (!supabase) {
      throw new Error('Supabase is not configured. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your .env file');
    }
    
    let supabaseQuery = supabase.from('users').select('*');
    
    // Handle search query
    if (query.$or) {
      // Supabase doesn't support $or directly, need to handle differently
      // For now, search by email, name, or walletAddress
      const emailRegex = query.$or.find(q => q.email)?.email?.$regex;
      const nameRegex = query.$or.find(q => q.name)?.name?.$regex;
      const walletRegex = query.$or.find(q => q.walletAddress)?.walletAddress?.$regex;
      
      if (emailRegex || nameRegex || walletRegex) {
        // Use OR with multiple filters - Supabase doesn't support OR directly in a single query
        // We'll need to fetch and filter in memory or use multiple queries
        // For now, prioritize email search
        if (emailRegex) {
          supabaseQuery = supabaseQuery.ilike('email', `%${emailRegex}%`);
        } else if (nameRegex) {
          supabaseQuery = supabaseQuery.ilike('name', `%${nameRegex}%`);
        } else if (walletRegex) {
          supabaseQuery = supabaseQuery.ilike('wallet_address', `%${walletRegex}%`);
        }
      }
    }
    
    // Handle sorting
    if (options.sort) {
      const sortField = Object.keys(options.sort)[0];
      const sortOrder = options.sort[sortField] === -1 ? false : true;
      let supabaseField = sortField;
      if (sortField === 'createdAt') supabaseField = 'created_at';
      if (sortField === 'updatedAt') supabaseField = 'updated_at';
      supabaseQuery = supabaseQuery.order(supabaseField, { ascending: sortOrder });
    } else {
      supabaseQuery = supabaseQuery.order('created_at', { ascending: false });
    }
    
    // Handle pagination
    if (options.skip !== undefined && options.limit !== undefined) {
      const from = options.skip;
      const to = options.skip + options.limit - 1;
      supabaseQuery = supabaseQuery.range(from, to);
    } else if (options.limit) {
      supabaseQuery = supabaseQuery.limit(options.limit);
    }
    
    const { data, error } = await supabaseQuery;
    
    if (error) throw error;
    
    return data.map(mapSupabaseUser);
  },

  // Count users
  count: async (query = {}) => {
    if (!supabase) {
      throw new Error('Supabase is not configured. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your .env file');
    }
    
    let supabaseQuery = supabase.from('users').select('*', { count: 'exact', head: true });
    
    if (query.$or) {
      const emailRegex = query.$or.find(q => q.email)?.email?.$regex;
      if (emailRegex) {
        supabaseQuery = supabaseQuery.ilike('email', `%${emailRegex}%`);
      }
    }
    
    const { count, error } = await supabaseQuery;
    
    if (error) throw error;
    
    return count || 0;
  },

  // Find users by referredBy
  findByReferredBy: async (userId) => {
    if (!supabase) {
      throw new Error('Supabase is not configured. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your .env file');
    }
    
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('referred_by', userId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    return data.map(mapSupabaseUser);
  },

  // Compare password
  comparePassword: async (candidatePassword, hashedPassword) => {
    return await bcrypt.compare(candidatePassword, hashedPassword);
  },

  // Delete user
  delete: async (id) => {
    if (!supabase) {
      throw new Error('Supabase is not configured. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your .env file');
    }
    
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    
    return true;
  },

  // Find and update (for compatibility)
  findByIdAndUpdate: async (id, updateData, options = {}) => {
    return await userService.update(id, updateData);
  },

  // Find and delete (for compatibility)
  findByIdAndDelete: async (id) => {
    await userService.delete(id);
    return null; // Return null to match Mongoose behavior
  }
};

