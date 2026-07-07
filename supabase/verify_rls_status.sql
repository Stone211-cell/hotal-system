-- ============================================================
-- VERIFY: Check that RLS is enabled on all public tables
-- Run this AFTER executing fix_rls_security.sql
-- ============================================================

SELECT 
  tablename AS "Table",
  CASE 
    WHEN rowsecurity THEN '✅ Protected' 
    ELSE '❌ VULNERABLE' 
  END AS "RLS Status"
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;
