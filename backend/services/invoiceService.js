import supabase from '../utils/supabase.js';

// Helper to convert Supabase invoice to app format
const mapSupabaseInvoice = (invoice) => {
  if (!invoice) return null;
  return {
    id: invoice.id,
    invoiceId: invoice.invoice_id,
    invoiceNumber: invoice.invoice_number,
    userId: invoice.user_id,
    subscriptionPlan: invoice.subscription_plan,
    amount: parseFloat(invoice.amount),
    currency: invoice.currency,
    status: invoice.status,
    transactionHash: invoice.transaction_hash,
    paymentMethod: invoice.payment_method,
    squarePaymentId: invoice.square_payment_id,
    squareOrderId: invoice.square_order_id,
    subscriptionStartDate: invoice.subscription_start_date,
    subscriptionEndDate: invoice.subscription_end_date,
    description: invoice.description,
    createdAt: invoice.created_at,
    updatedAt: invoice.updated_at
  };
};

// Helper to convert app format to Supabase format
const mapToSupabaseInvoice = (invoice) => {
  const supabaseInvoice = {};
  if (invoice.invoiceId !== undefined) supabaseInvoice.invoice_id = invoice.invoiceId;
  if (invoice.invoiceNumber !== undefined) supabaseInvoice.invoice_number = invoice.invoiceNumber;
  if (invoice.userId !== undefined) supabaseInvoice.user_id = invoice.userId;
  if (invoice.subscriptionPlan !== undefined) supabaseInvoice.subscription_plan = invoice.subscriptionPlan;
  if (invoice.amount !== undefined) supabaseInvoice.amount = invoice.amount;
  if (invoice.currency !== undefined) supabaseInvoice.currency = invoice.currency;
  if (invoice.status !== undefined) supabaseInvoice.status = invoice.status;
  if (invoice.transactionHash !== undefined) supabaseInvoice.transaction_hash = invoice.transactionHash;
  if (invoice.paymentMethod !== undefined) supabaseInvoice.payment_method = invoice.paymentMethod;
  if (invoice.squarePaymentId !== undefined) supabaseInvoice.square_payment_id = invoice.squarePaymentId;
  if (invoice.squareOrderId !== undefined) supabaseInvoice.square_order_id = invoice.squareOrderId;
  if (invoice.subscriptionStartDate !== undefined) supabaseInvoice.subscription_start_date = invoice.subscriptionStartDate;
  if (invoice.subscriptionEndDate !== undefined) supabaseInvoice.subscription_end_date = invoice.subscriptionEndDate;
  if (invoice.description !== undefined) supabaseInvoice.description = invoice.description;
  return supabaseInvoice;
};

export const invoiceService = {
  // Find invoice by invoiceId
  findByInvoiceId: async (invoiceId) => {
    if (!supabase) {
      throw new Error('Supabase is not configured');
    }
    
    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('invoice_id', invoiceId)
      .single();
    
    if (error && error.code !== 'PGRST116') {
      throw error;
    }
    
    return mapSupabaseInvoice(data);
  },

  // Find invoice by ID
  findById: async (id) => {
    if (!supabase) {
      throw new Error('Supabase is not configured');
    }
    
    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error && error.code !== 'PGRST116') {
      throw error;
    }
    
    return mapSupabaseInvoice(data);
  },

  // Find invoices by userId
  findByUserId: async (userId) => {
    if (!supabase) {
      throw new Error('Supabase is not configured');
    }
    
    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    return data.map(mapSupabaseInvoice);
  },

  // Find invoice by squarePaymentId
  findBySquarePaymentId: async (squarePaymentId) => {
    if (!supabase) {
      throw new Error('Supabase is not configured');
    }
    
    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('square_payment_id', squarePaymentId)
      .single();
    
    if (error && error.code !== 'PGRST116') {
      throw error;
    }
    
    return mapSupabaseInvoice(data);
  },

  // Create new invoice
  create: async (invoiceData) => {
    if (!supabase) {
      throw new Error('Supabase is not configured');
    }
    
    const supabaseInvoice = mapToSupabaseInvoice(invoiceData);
    
    const { data, error } = await supabase
      .from('invoices')
      .insert([supabaseInvoice])
      .select()
      .single();
    
    if (error) {
      if (error.code === '23505') {
        const duplicateError = new Error('Invoice ID already exists');
        duplicateError.code = 11000;
        throw duplicateError;
      }
      throw error;
    }
    
    return mapSupabaseInvoice(data);
  },

  // Update invoice
  update: async (id, updateData) => {
    if (!supabase) {
      throw new Error('Supabase is not configured');
    }
    
    const supabaseUpdate = mapToSupabaseInvoice(updateData);
    
    const { data, error } = await supabase
      .from('invoices')
      .update(supabaseUpdate)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    
    return mapSupabaseInvoice(data);
  },

  // Find and update (for compatibility)
  findOneAndUpdate: async (query, updateData, options = {}) => {
    let invoice;
    
    if (query.invoiceId) {
      invoice = await invoiceService.findByInvoiceId(query.invoiceId);
    } else if (query.squarePaymentId) {
      invoice = await invoiceService.findBySquarePaymentId(query.squarePaymentId);
    } else if (query.id) {
      invoice = await invoiceService.findById(query.id);
    }
    
    if (!invoice) {
      if (options.upsert) {
        // Create new invoice if upsert is true
        return await invoiceService.create(updateData);
      }
      return null;
    }
    
    return await invoiceService.update(invoice.id, updateData);
  },

  // Find one (for compatibility)
  findOne: async (query) => {
    if (query.invoiceId) {
      return await invoiceService.findByInvoiceId(query.invoiceId);
    }
    if (query.squarePaymentId) {
      return await invoiceService.findBySquarePaymentId(query.squarePaymentId);
    }
    if (query.id) {
      return await invoiceService.findById(query.id);
    }
    return null;
  },

  // Find all invoices with pagination and filters
  find: async (query = {}, options = {}) => {
    if (!supabase) {
      throw new Error('Supabase is not configured');
    }
    
    let supabaseQuery = supabase.from('invoices').select('*');
    
    // Apply filters
    if (query.userId !== undefined) {
      supabaseQuery = supabaseQuery.eq('user_id', query.userId);
    }
    if (query.status !== undefined) {
      supabaseQuery = supabaseQuery.eq('status', query.status);
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
      throw error;
    }
    
    return data.map(mapSupabaseInvoice);
  },

  // Count invoices
  count: async (query = {}) => {
    if (!supabase) {
      throw new Error('Supabase is not configured');
    }
    
    let supabaseQuery = supabase.from('invoices').select('*', { count: 'exact', head: true });
    
    // Apply filters
    if (query.userId !== undefined) {
      supabaseQuery = supabaseQuery.eq('user_id', query.userId);
    }
    if (query.status !== undefined) {
      supabaseQuery = supabaseQuery.eq('status', query.status);
    }
    
    const { count, error } = await supabaseQuery;
    
    if (error) {
      throw error;
    }
    
    return count || 0;
  }
};

