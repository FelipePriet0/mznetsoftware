-- =====================================================
-- DEBUG: Verificar se as tarefas estão sendo criadas corretamente
-- =====================================================

-- 1. Verificar se a tabela card_tasks existe e tem dados
SELECT 
  'card_tasks table info' as info,
  COUNT(*) as total_tasks,
  COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_tasks,
  COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_tasks
FROM public.card_tasks;

-- 2. Verificar as tarefas mais recentes
SELECT 
  id,
  card_id,
  card_title,
  created_by,
  assigned_to,
  description,
  status,
  comment_id,
  created_at
FROM public.card_tasks 
ORDER BY created_at DESC 
LIMIT 10;

-- 3. Verificar se há tarefas vinculadas a comentários
SELECT 
  'Tarefas com comment_id' as info,
  COUNT(*) as count
FROM public.card_tasks 
WHERE comment_id IS NOT NULL;

-- 4. Verificar políticas RLS ativas
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'card_tasks'
ORDER BY policyname;

-- 5. Verificar se o trigger está funcionando (card_title preenchido)
SELECT 
  'Tarefas com card_title' as info,
  COUNT(*) as count
FROM public.card_tasks 
WHERE card_title IS NOT NULL;

-- 6. Log de debug
DO $$
BEGIN
  RAISE NOTICE '🔍 Debug das tarefas executado! Verifique os resultados acima.';
END $$;
