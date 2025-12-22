import supabase from '../utils/supabase.js';

// Helper to convert Supabase access code to app format
const mapSupabaseAccessCode = (code) => {
  if (!code) return null;
  return {
    id: code.id,
    code: code.code,
    isActive: code.is_active,
    maxUses: code.max_uses,
    usedCount: code.used_count || 0,
    expiresAt: code.expires_at,
    createdBy: code.created_by,
    description: code.description,
    subscriptionPlan: code.subscription_plan,
    subscriptionDuration: code.subscription_duration,
    createdAt: code.created_at,
    updatedAt: code.updated_at
  };
};

// Helper to convert app format to Supabase format
const mapToSupabaseAccessCode = (code) => {
  const supabaseCode = {};
  if (code.code !== undefined) supabaseCode.code = code.code.toUpperCase().trim();
  if (code.isActive !== undefined) supabaseCode.is_active = code.isActive;
  if (code.maxUses !== undefined) supabaseCode.max_uses = code.maxUses;
  if (code.usedCount !== undefined) supabaseCode.used_count = code.usedCount;
  if (code.expiresAt !== undefined) supabaseCode.expires_at = code.expiresAt;
  if (code.createdBy !== undefined) supabaseCode.created_by = code.createdBy;
  if (code.description !== undefined) supabaseCode.description = code.description;
  if (code.subscriptionPlan !== undefined) supabaseCode.subscription_plan = code.subscriptionPlan;
  if (code.subscriptionDuration !== undefined) supabaseCode.subscription_duration = code.subscriptionDuration;
  return supabaseCode;
};

export const accessCodeService = {
  // Find access code by code string
  findByCode: async (code) => {
    if (!supabase) {
      throw new Error('Supabase is not configured');
    }
    
    const normalizedCode = code.toUpperCase().trim();
    const { data, error } = await supabase
      .from('access_codes')
      .select('*')
      .eq('code', normalizedCode)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      // Provide helpful error message if table doesn't exist
      if (error.message?.includes('schema cache') || error.message?.includes('not found') || error.code === '42P01') {
        const helpfulError = new Error(
          'The access_codes table does not exist in Supabase. Please run the SQL migration script (supabase_migration_schemas.sql) in your Supabase SQL Editor to create the required tables.'
        );
        helpfulError.code = 'TABLE_NOT_FOUND';
        throw helpfulError;
      }
      throw error;
    }
    
    return mapSupabaseAccessCode(data);
  },

  // Find access code by ID
  findById: async (id) => {
    if (!supabase) {
      throw new Error('Supabase is not configured');
    }
    
    const { data, error } = await supabase
      .from('access_codes')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      // Provide helpful error message if table doesn't exist
      if (error.message?.includes('schema cache') || error.message?.includes('not found') || error.code === '42P01') {
        const helpfulError = new Error(
          'The access_codes table does not exist in Supabase. Please run the SQL migration script (supabase_migration_schemas.sql) in your Supabase SQL Editor to create the required tables.'
        );
        helpfulError.code = 'TABLE_NOT_FOUND';
        throw helpfulError;
      }
      throw error;
    }
    
    return mapSupabaseAccessCode(data);
  },

  // Create new access code
  create: async (codeData) => {
    if (!supabase) {
      throw new Error('Supabase is not configured');
    }
    
    const supabaseCode = mapToSupabaseAccessCode(codeData);
    
    const { data, error } = await supabase
      .from('access_codes')
      .insert([supabaseCode])
      .select()
      .single();
    
    if (error) {
      if (error.code === '23505') {
        const duplicateError = new Error('Access code already exists');
        duplicateError.code = 11000;
        throw duplicateError;
      }
      // Provide helpful error message if table doesn't exist
      if (error.message?.includes('schema cache') || error.message?.includes('not found') || error.code === '42P01') {
        const helpfulError = new Error(
          'The access_codes table does not exist in Supabase. Please run the SQL migration script (supabase_migration_schemas.sql) in your Supabase SQL Editor to create the required tables.'
        );
        helpfulError.code = 'TABLE_NOT_FOUND';
        throw helpfulError;
      }
      throw error;
    }
    
    return mapSupabaseAccessCode(data);
  },

  // Update access code
  update: async (id, updateData) => {
    if (!supabase) {
      throw new Error('Supabase is not configured');
    }
    
    const supabaseUpdate = mapToSupabaseAccessCode(updateData);
    
    const { data, error } = await supabase
      .from('access_codes')
      .update(supabaseUpdate)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      // Provide helpful error message if table doesn't exist
      if (error.message?.includes('schema cache') || error.message?.includes('not found') || error.code === '42P01') {
        const helpfulError = new Error(
          'The access_codes table does not exist in Supabase. Please run the SQL migration script (supabase_migration_schemas.sql) in your Supabase SQL Editor to create the required tables.'
        );
        helpfulError.code = 'TABLE_NOT_FOUND';
        throw helpfulError;
      }
      throw error;
    }
    
    return mapSupabaseAccessCode(data);
  },

  // Find all access codes with filters
  find: async (query = {}, options = {}) => {
    if (!supabase) {
      throw new Error('Supabase is not configured');
    }
    
    let supabaseQuery = supabase.from('access_codes').select('*');
    
    if (query.isActive !== undefined) {
      supabaseQuery = supabaseQuery.eq('is_active', query.isActive);
    }
    
    if (query.createdBy !== undefined) {
      supabaseQuery = supabaseQuery.eq('created_by', query.createdBy);
    }
    
    // Handle sorting
    if (options.sort) {
      const sortField = Object.keys(options.sort)[0];
      const sortOrder = options.sort[sortField] === -1 ? false : true;
      let supabaseField = sortField === 'createdAt' ? 'created_at' : sortField === 'updatedAt' ? 'updated_at' : sortField;
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
    
    if (error) {
      // Provide helpful error message if table doesn't exist
      if (error.message?.includes('schema cache') || error.message?.includes('not found') || error.code === '42P01') {
        const helpfulError = new Error(
          'The access_codes table does not exist in Supabase. Please run the SQL migration script (supabase_migration_schemas.sql) in your Supabase SQL Editor to create the required tables.'
        );
        helpfulError.code = 'TABLE_NOT_FOUND';
        throw helpfulError;
      }
      throw error;
    }
    
    return data.map(mapSupabaseAccessCode);
  },

  // Count access codes
  count: async (query = {}) => {
    if (!supabase) {
      throw new Error('Supabase is not configured');
    }
    
    let supabaseQuery = supabase.from('access_codes').select('*', { count: 'exact', head: true });
    
    if (query.isActive !== undefined) {
      supabaseQuery = supabaseQuery.eq('is_active', query.isActive);
    }
    
    const { count, error } = await supabaseQuery;
    
    if (error) {
      // Provide helpful error message if table doesn't exist
      if (error.message?.includes('schema cache') || error.message?.includes('not found') || error.code === '42P01') {
        const helpfulError = new Error(
          'The access_codes table does not exist in Supabase. Please run the SQL migration script (supabase_migration_schemas.sql) in your Supabase SQL Editor to create the required tables.'
        );
        helpfulError.code = 'TABLE_NOT_FOUND';
        throw helpfulError;
      }
      throw error;
    }
    
    return count || 0;
  },

  // Delete access code
  delete: async (id) => {
    if (!supabase) {
      throw new Error('Supabase is not configured');
    }
    
    const { error } = await supabase
      .from('access_codes')
      .delete()
      .eq('id', id);
    
    if (error) {
      // Provide helpful error message if table doesn't exist
      if (error.message?.includes('schema cache') || error.message?.includes('not found') || error.code === '42P01') {
        const helpfulError = new Error(
          'The access_codes table does not exist in Supabase. Please run the SQL migration script (supabase_migration_schemas.sql) in your Supabase SQL Editor to create the required tables.'
        );
        helpfulError.code = 'TABLE_NOT_FOUND';
        throw helpfulError;
      }
      throw error;
    }
    
    return true;
  },

  // Check if code is valid (matches Mongoose method)
  isValid: (code) => {
    if (!code.isActive) {
      return { valid: false, reason: 'Code is inactive' };
    }
    
    if (code.expiresAt && new Date() > new Date(code.expiresAt)) {
      return { valid: false, reason: 'Code has expired' };
    }
    
    if (code.maxUses !== null && code.usedCount >= code.maxUses) {
      return { valid: false, reason: 'Code has reached maximum uses' };
    }
    
    return { valid: true };
  },

  // Increment usage
  incrementUsage: async (id) => {
    if (!supabase) {
      throw new Error('Supabase is not configured');
    }
    
    // Get current code
    const code = await accessCodeService.findById(id);
    if (!code) {
      throw new Error('Access code not found');
    }
    
    // Update used count
    return await accessCodeService.update(id, {
      usedCount: (code.usedCount || 0) + 1
    });
  },

  // Find one (for compatibility)
  findOne: async (query) => {
    if (query.code) {
      return await accessCodeService.findByCode(query.code);
    }
    if (query.id) {
      return await accessCodeService.findById(query.id);
    }
    // For other queries, use find and return first result
    const results = await accessCodeService.find(query, { limit: 1 });
    return results.length > 0 ? results[0] : null;
  }
};

