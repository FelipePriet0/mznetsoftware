-- ============================================================
-- ðŸ” DIAGNÃ“STICO COMPLETO DE RLS - USANDO E WITH CHECK
-- ============================================================
-- Execute este SQL no Supabase SQL Editor
-- Identifica o que estÃ¡ bloqueando o UPDATE
-- ============================================================

-- 1ï¸âƒ£ VER TODAS AS POLÃTICAS UPDATE (USING + WITH CHECK)
SELECT 
  '1. POLÃTICAS UPDATE COMPLETAS' as secao,
  tablename,
  policyname,
  cmd,
  qual as using_expression,
  with_check as check_expression,
  CASE 
    WHEN cmd = 'UPDATE' AND qual IS NOT NULL THEN 'âš ï¸ USING pode bloquear'
    WHEN cmd = 'UPDATE' AND with_check IS NOT NULL THEN 'âš ï¸ WITH CHECK pode bloquear'
    ELSE 'âœ… OK'
  END as status
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('card_comments', 'card_attachments')
  AND cmd = 'UPDATE'
ORDER BY tablename, policyname;

-- 2ï¸âƒ£ VERIFICAR SE HÃ MÃšLTIPLAS POLÃTICAS (problema comum)
SELECT 
  '2. CONTAGEM DE POLÃTICAS UPDATE' as secao,
  tablename,
  COUNT(*) as total_update_policies,
  CASE 
    WHEN COUNT(*) > 1 THEN 'ðŸš¨ PROBLEMA: MÃºltiplas polÃ­ticas podem conflitar'
    ELSE 'âœ… OK'
  END as diagnostico
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('card_comments', 'card_attachments')
  AND cmd = 'UPDATE'
GROUP BY tablename;

-- 3ï¸âƒ£ VERIFICAR SE RLS ESTÃ ATIVO
SELECT 
  '3. RLS ATIVO?' as secao,
  tablename,
  rowsecurity as rls_enabled,
  CASE 
    WHEN rowsecurity = true THEN 'âœ… RLS ativo (correto)'
    ELSE 'âš ï¸ RLS desativado'
  END as status
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('card_comments', 'card_attachments');

-- 4ï¸âƒ£ VERIFICAR SE USUÃRIO AUTENTICADO PODE FAZER UPDATE
SELECT 
  '4. TESTE DE PERMISSÃƒO' as secao,
  'auth.uid() IS NOT NULL: ' || (auth.uid() IS NOT NULL)::text as user_authenticated,
  'User ID: ' || COALESCE(auth.uid()::text, 'NULL') as current_user_id;

-- 5ï¸âƒ£ SIMULAR O UPDATE QUE O FRONT ESTÃ TENTANDO FAZER
-- (mostra se a polÃ­tica USING estÃ¡ bloqueando)
EXPLAIN (VERBOSE, COSTS OFF)
UPDATE card_comments
SET 
  deleted_at = NOW(),
  deleted_by = auth.uid()
WHERE id = 'c75a143f-d0c1-4104-92be-6b636d3c0fef';

-- 6ï¸âƒ£ VERIFICAR SE EXISTEM TRIGGERS QUE POSSAM BLOQUEAR
SELECT 
  '6. TRIGGERS NA TABELA' as secao,
  trigger_name,
  event_manipulation,
  action_statement,
  CASE 
    WHEN action_statement LIKE '%deleted_at%' THEN 'âš ï¸ Trigger pode interferir'
    ELSE 'âœ… Trigger normal'
  END as diagnostico
FROM information_schema.triggers
WHERE event_object_table IN ('card_comments', 'card_attachments')
  AND event_object_schema = 'public';

