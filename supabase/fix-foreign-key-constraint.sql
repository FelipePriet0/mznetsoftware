-- =====================================================
-- VERIFICAR E CORRIGIR FOREIGN KEY CONSTRAINT
-- =====================================================
-- Este script verifica se a constraint card_tasks_assigned_to_fkey está correta
-- e se há problemas com usuários inexistentes

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

-- 2. Verificar se há tarefas com assigned_to inválido
SELECT 
  'Tarefas com assigned_to inválido' as info,
  COUNT(*) as count
FROM public.card_tasks ct
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles p 
  WHERE p.id = ct.assigned_to
);

-- 3. Verificar se há tarefas com created_by inválido
SELECT 
  'Tarefas com created_by inválido' as info,
  COUNT(*) as count
FROM public.card_tasks ct
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles p 
  WHERE p.id = ct.created_by
);

-- 4. Verificar se há tarefas com card_id inválido
SELECT 
  'Tarefas com card_id inválido' as info,
  COUNT(*) as count
FROM public.card_tasks ct
WHERE NOT EXISTS (
  SELECT 1 FROM public.kanban_cards kc 
  WHERE kc.id = ct.card_id
);

-- 5. Mostrar usuários válidos para referência
SELECT 
  'Usuários válidos para assigned_to' as info,
  id,
  full_name,
  role
FROM public.profiles
ORDER BY role, full_name;

-- 6. Limpar tarefas com dados inválidos (se houver)
-- ATENÇÃO: Este comando pode deletar dados! Use com cuidado.
-- Descomente apenas se necessário:
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

-- 7. Verificar se a constraint está funcionando
DO $$
BEGIN
  RAISE NOTICE '🔍 Verificando constraints de foreign key...';
  RAISE NOTICE '✅ Se não houver erros acima, as constraints estão corretas!';
  RAISE NOTICE '❌ Se houver tarefas com dados inválidos, elas precisam ser limpas.';
END $$;
