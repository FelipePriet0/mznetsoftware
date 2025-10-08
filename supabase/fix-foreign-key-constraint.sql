-- =====================================================
-- VERIFICAR E CORRIGIR FOREIGN KEY CONSTRAINT
-- =====================================================
-- Este script verifica se a constraint card_tasks_assigned_to_fkey estÃ¡ correta
-- e se hÃ¡ problemas com usuÃ¡rios inexistentes

-- 1. Verificar a constraint de foreign key
SELECT 
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_name = 'card_tasks'
  AND kcu.column_name = 'assigned_to';

-- 2. Verificar se hÃ¡ tarefas com assigned_to invÃ¡lido
SELECT 
  'Tarefas com assigned_to invÃ¡lido' as info,
  COUNT(*) as count
FROM public.card_tasks ct
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles p 
  WHERE p.id = ct.assigned_to
);

-- 3. Verificar se hÃ¡ tarefas com created_by invÃ¡lido
SELECT 
  'Tarefas com created_by invÃ¡lido' as info,
  COUNT(*) as count
FROM public.card_tasks ct
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles p 
  WHERE p.id = ct.created_by
);

-- 4. Verificar se hÃ¡ tarefas com card_id invÃ¡lido
SELECT 
  'Tarefas com card_id invÃ¡lido' as info,
  COUNT(*) as count
FROM public.card_tasks ct
WHERE NOT EXISTS (
  SELECT 1 FROM public.kanban_cards kc 
  WHERE kc.id = ct.card_id
);

-- 5. Mostrar usuÃ¡rios vÃ¡lidos para referÃªncia
SELECT 
  'UsuÃ¡rios vÃ¡lidos para assigned_to' as info,
  id,
  full_name,
  role
FROM public.profiles
ORDER BY role, full_name;

-- 6. Limpar tarefas com dados invÃ¡lidos (se houver)
-- ATENÃ‡ÃƒO: Este comando pode deletar dados! Use com cuidado.
-- Descomente apenas se necessÃ¡rio:
/*
DELETE FROM public.card_tasks 
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles p 
  WHERE p.id = card_tasks.assigned_to
) OR NOT EXISTS (
  SELECT 1 FROM public.profiles p 
  WHERE p.id = card_tasks.created_by
) OR NOT EXISTS (
  SELECT 1 FROM public.kanban_cards kc 
  WHERE kc.id = card_tasks.card_id
);
*/

-- 7. Verificar se a constraint estÃ¡ funcionando
DO $$
BEGIN
  RAISE NOTICE 'ðŸ” Verificando constraints de foreign key...';
  RAISE NOTICE 'âœ… Se nÃ£o houver erros acima, as constraints estÃ£o corretas!';
  RAISE NOTICE 'âŒ Se houver tarefas com dados invÃ¡lidos, elas precisam ser limpas.';
END $$;
