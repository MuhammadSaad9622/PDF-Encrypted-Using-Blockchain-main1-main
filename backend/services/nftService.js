import supabase from '../utils/supabase.js';

// Helper to convert Supabase NFT to app format
const mapSupabaseNFT = (nft) => {
  if (!nft) return null;
  return {
    id: nft.id,
    tokenId: nft.token_id,
    encryptionKey: nft.encryption_key,
    supabasePath: nft.supabase_path,
    supabaseUrl: nft.supabase_url,
    arweaveId: nft.arweave_id,
    arweaveUrl: nft.arweave_url,
    recipientAddress: nft.recipient_address,
    userId: nft.user_id,
    originalName: nft.original_name,
    fileSize: nft.file_size || 0,
    createdAt: nft.created_at,
    updatedAt: nft.updated_at
  };
};

// Helper to convert app format to Supabase format
const mapToSupabaseNFT = (nft) => {
  const supabaseNFT = {};
  if (nft.tokenId !== undefined) supabaseNFT.token_id = nft.tokenId;
  if (nft.encryptionKey !== undefined) supabaseNFT.encryption_key = nft.encryptionKey;
  if (nft.supabasePath !== undefined) supabaseNFT.supabase_path = nft.supabasePath;
  if (nft.supabaseUrl !== undefined) supabaseNFT.supabase_url = nft.supabaseUrl;
  if (nft.arweaveId !== undefined) supabaseNFT.arweave_id = nft.arweaveId;
  if (nft.arweaveUrl !== undefined) supabaseNFT.arweave_url = nft.arweaveUrl;
  if (nft.recipientAddress !== undefined) supabaseNFT.recipient_address = nft.recipientAddress;
  if (nft.userId !== undefined) supabaseNFT.user_id = nft.userId;
  if (nft.originalName !== undefined) supabaseNFT.original_name = nft.originalName;
  if (nft.fileSize !== undefined) supabaseNFT.file_size = nft.fileSize;
  return supabaseNFT;
};

export const nftService = {
  // Find NFT by tokenId
  findByTokenId: async (tokenId) => {
    if (!supabase) {
      throw new Error('Supabase is not configured');
    }
    
    const { data, error } = await supabase
      .from('nfts')
      .select('*')
      .eq('token_id', tokenId)
      .single();
    
    if (error && error.code !== 'PGRST116') {
      throw error;
    }
    
    return mapSupabaseNFT(data);
  },

  // Find NFT by ID
  findById: async (id) => {
    if (!supabase) {
      throw new Error('Supabase is not configured');
    }
    
    const { data, error } = await supabase
      .from('nfts')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error && error.code !== 'PGRST116') {
      throw error;
    }
    
    return mapSupabaseNFT(data);
  },

  // Find NFTs by userId (now using UUID instead of ObjectId)
  findByUserId: async (userId) => {
    if (!supabase) {
      throw new Error('Supabase is not configured');
    }
    
    const { data, error } = await supabase
      .from('nfts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    return data.map(mapSupabaseNFT);
  },

  // Find NFTs by recipient address
  findByRecipientAddress: async (recipientAddress) => {
    if (!supabase) {
      throw new Error('Supabase is not configured');
    }
    
    const { data, error } = await supabase
      .from('nfts')
      .select('*')
      .eq('recipient_address', recipientAddress)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    return data.map(mapSupabaseNFT);
  },

  // Create new NFT
  create: async (nftData) => {
    if (!supabase) {
      throw new Error('Supabase is not configured');
    }
    
    const supabaseNFT = mapToSupabaseNFT(nftData);
    
    const { data, error } = await supabase
      .from('nfts')
      .insert([supabaseNFT])
      .select()
      .single();
    
    if (error) {
      if (error.code === '23505') {
        const duplicateError = new Error('NFT with this tokenId already exists');
        duplicateError.code = 11000;
        throw duplicateError;
      }
      throw error;
    }
    
    return mapSupabaseNFT(data);
  },

  // Update NFT
  update: async (id, updateData) => {
    if (!supabase) {
      throw new Error('Supabase is not configured');
    }
    
    const supabaseUpdate = mapToSupabaseNFT(updateData);
    
    const { data, error } = await supabase
      .from('nfts')
      .update(supabaseUpdate)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    
    return mapSupabaseNFT(data);
  },

  // Find all NFTs with filters
  find: async (query = {}, options = {}) => {
    if (!supabase) {
      throw new Error('Supabase is not configured');
    }
    
    let supabaseQuery = supabase.from('nfts').select('*');
    
    if (query.userId) {
      supabaseQuery = supabaseQuery.eq('user_id', query.userId);
    }
    if (query.recipientAddress) {
      supabaseQuery = supabaseQuery.eq('recipient_address', query.recipientAddress);
    }
    if (query.tokenId) {
      supabaseQuery = supabaseQuery.eq('token_id', query.tokenId);
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
    
    if (error) throw error;
    
    return data.map(mapSupabaseNFT);
  },

  // Count NFTs
  count: async (query = {}) => {
    if (!supabase) {
      throw new Error('Supabase is not configured');
    }
    
    let supabaseQuery = supabase.from('nfts').select('*', { count: 'exact', head: true });
    
    if (query.userId) {
      supabaseQuery = supabaseQuery.eq('user_id', query.userId);
    }
    if (query.recipientAddress) {
      supabaseQuery = supabaseQuery.eq('recipient_address', query.recipientAddress);
    }
    
    const { count, error } = await supabaseQuery;
    
    if (error) throw error;
    
    return count || 0;
  },

  // Find one and update (for compatibility with Mongoose)
  findOneAndUpdate: async (query, updateData, options = {}) => {
    let nft;
    
    if (query.tokenId) {
      nft = await nftService.findByTokenId(query.tokenId);
    } else if (query.id) {
      nft = await nftService.findById(query.id);
    }
    
    if (!nft) {
      if (options.upsert) {
        // Create new NFT if upsert is true
        return await nftService.create({ ...query, ...updateData });
      }
      return null;
    }
    
    // Merge update data
    const mergedData = { ...nft, ...updateData };
    return await nftService.update(nft.id, mergedData);
  },

  // Find one (for compatibility)
  findOne: async (query) => {
    if (query.tokenId) {
      return await nftService.findByTokenId(query.tokenId);
    }
    if (query.id) {
      return await nftService.findById(query.id);
    }
    // For other queries, use find and return first result
    const results = await nftService.find(query, { limit: 1 });
    return results.length > 0 ? results[0] : null;
  }
};

