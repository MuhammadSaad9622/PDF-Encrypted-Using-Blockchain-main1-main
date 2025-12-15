-- ============================================
-- CHECK RLS POLICIES AND PERMISSIONS
-- Run this to verify RLS is set up correctly
-- ============================================

-- Check RLS policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('access_codes', 'invoices', 'nfts')
ORDER BY tablename, policyname;

-- Check if RLS is enabled
SELECT 
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('access_codes', 'invoices', 'nfts')
ORDER BY tablename;

-- Check permissions for service_role
SELECT 
  grantee,
  table_schema,
  table_name,
  privilege_type
FROM information_schema.role_table_grants
WHERE grantee = 'service_role'
  AND table_schema = 'public'
  AND table_name IN ('access_codes', 'invoices', 'nfts')
ORDER BY table_name, privilege_type;

