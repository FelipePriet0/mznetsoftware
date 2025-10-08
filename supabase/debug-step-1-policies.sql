-- ============================================================
-- PASSO 1: VER POLÃTICAS UPDATE EM card_comments
-- ============================================================

SELECT 
  policyname,
  cmd,
  qual::text as using_clause,
  with_check::text as check_clause
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'card_comments'
  AND cmd = 'UPDATE';

