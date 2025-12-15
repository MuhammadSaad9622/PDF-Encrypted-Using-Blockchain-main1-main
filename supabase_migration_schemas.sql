-- ============================================
-- SUPABASE MIGRATION SCHEMAS
-- Run these in Supabase SQL Editor
-- ============================================

-- ============================================
-- HELPER FUNCTION FOR UPDATED_AT TRIGGERS
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 1. ACCESS CODES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS access_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  max_uses INTEGER DEFAULT NULL, -- NULL means unlimited
  used_count INTEGER DEFAULT 0,
  expires_at TIMESTAMPTZ DEFAULT NULL, -- NULL means no expiration
  created_by UUID REFERENCES users(id),
  description TEXT DEFAULT '',
  subscription_plan TEXT CHECK (subscription_plan IN ('basic', 'monthly', 'yearly', 'lifetime')),
  subscription_duration INTEGER DEFAULT NULL, -- Duration in days
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_access_codes_code ON access_codes(code);
CREATE INDEX idx_access_codes_is_active ON access_codes(is_active);
CREATE INDEX idx_access_codes_created_by ON access_codes(created_by);

-- ============================================
-- 2. INVOICES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id TEXT UNIQUE NOT NULL,
  invoice_number TEXT UNIQUE,
  user_id UUID REFERENCES users(id) NOT NULL,
  subscription_plan TEXT DEFAULT 'basic' CHECK (subscription_plan IN ('basic', 'monthly', 'yearly', 'lifetime')),
  amount DECIMAL(10, 2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  status TEXT DEFAULT 'Pending' CHECK (status IN ('Paid', 'Pending', 'Failed', 'Cancelled')),
  transaction_hash TEXT DEFAULT NULL,
  payment_method TEXT DEFAULT 'blockchain',
  square_payment_id TEXT DEFAULT NULL,
  square_order_id TEXT DEFAULT NULL,
  subscription_start_date TIMESTAMPTZ DEFAULT NOW(),
  subscription_end_date TIMESTAMPTZ DEFAULT NULL,
  description TEXT DEFAULT 'Platform Subscription',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_invoices_invoice_id ON invoices(invoice_id);
CREATE INDEX idx_invoices_user_id ON invoices(user_id);
CREATE INDEX idx_invoices_square_payment_id ON invoices(square_payment_id);
CREATE INDEX idx_invoices_user_created ON invoices(user_id, created_at DESC);

-- ============================================
-- 3. NFTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS nfts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_id TEXT UNIQUE NOT NULL,
  encryption_key TEXT NOT NULL, -- JSON string of {key, iv}
  supabase_path TEXT DEFAULT NULL,
  supabase_url TEXT DEFAULT NULL,
  arweave_id TEXT DEFAULT NULL,
  arweave_url TEXT DEFAULT NULL,
  recipient_address TEXT NOT NULL,
  user_id UUID REFERENCES users(id), -- Optional for backward compatibility
  original_name TEXT DEFAULT NULL,
  file_size BIGINT DEFAULT 0, -- File size in bytes
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_nfts_token_id ON nfts(token_id);
CREATE INDEX idx_nfts_user_id ON nfts(user_id);
CREATE INDEX idx_nfts_recipient_address ON nfts(recipient_address);

-- ============================================
-- UPDATE TRIGGERS FOR ALL TABLES
-- ============================================

-- Update trigger for access_codes
CREATE TRIGGER update_access_codes_updated_at BEFORE UPDATE ON access_codes
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Update trigger for invoices
CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Update trigger for nfts
CREATE TRIGGER update_nfts_updated_at BEFORE UPDATE ON nfts
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================
-- Enable RLS on all tables
ALTER TABLE access_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE nfts ENABLE ROW LEVEL SECURITY;

-- Allow service role (backend) to access all tables
-- This is needed for the service role key to work
CREATE POLICY "Service role can access access_codes" ON access_codes
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role can access invoices" ON invoices
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role can access nfts" ON nfts
  FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- GRANT PERMISSIONS
-- ============================================
-- Grant necessary permissions to service_role
GRANT ALL ON access_codes TO service_role;
GRANT ALL ON invoices TO service_role;
GRANT ALL ON nfts TO service_role;

-- Grant usage on sequences (for UUID generation)
GRANT USAGE ON SCHEMA public TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;

