-- ============================================
-- VERIFY SUPABASE TABLES EXIST
-- Run this in Supabase SQL Editor to verify tables were created
-- ============================================

-- Check if tables exist
SELECT 
  table_name,
  table_schema
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('users', 'access_codes', 'invoices', 'nfts')
ORDER BY table_name;

-- Check table structures
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'access_codes'
ORDER BY ordinal_position;

-- Check indexes
SELECT 
  indexname,
  tablename
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('access_codes', 'invoices', 'nfts')
ORDER BY tablename, indexname;

-- Check RLS policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('access_codes', 'invoices', 'nfts')
ORDER BY tablename, policyname;

