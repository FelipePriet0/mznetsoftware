-- ============================================================
-- PASSO 3: LISTAR TODAS AS POLÃTICAS RLS
-- ============================================================

SELECT 
  tablename,
  policyname,
  cmd,
  permissive,
  roles::text as applies_to_roles
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'card_comments'
ORDER BY cmd, policyname;

