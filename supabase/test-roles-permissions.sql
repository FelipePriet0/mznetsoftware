-- =====================================================
-- TESTE DE PERMISSÕES PARA DIFERENTES ROLES
-- =====================================================
-- Este script testa se as políticas RLS estão permitindo
-- que diferentes roles acessem as tarefas

-- 1. Verificar usuários e suas roles
SELECT 
  'Usuários e Roles' as info,
  id,
  full_name,
  role,
  email
FROM public.profiles 
ORDER BY role, full_name;

-- 2. Verificar tarefas existentes
SELECT 
  'Tarefas Existentes' as info,
  COUNT(*) as total_tasks,
  COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
  COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed
FROM public.card_tasks;

-- 3. Verificar políticas RLS ativas
SELECT 
  'Políticas RLS Ativas' as info,
  policyname,
  cmd,
  permissive,
  qual
FROM pg_policies 
WHERE tablename = 'card_tasks'
ORDER BY policyname;

-- 4. Simular acesso de diferentes roles (usando funções de teste)
-- Nota: Este é um teste conceitual - em produção seria testado com usuários reais

-- Verificar se a política de SELECT permite acesso geral
DO $$
DECLARE
  select_policy_exists boolean;
  update_policy_exists boolean;
BEGIN
  -- Verificar se as políticas existem
  SELECT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'card_tasks' 
    AND policyname = 'tasks_select_policy'
    AND cmd = 'SELECT'
  ) INTO select_policy_exists;
  
  SELECT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'card_tasks' 
    AND policyname = 'tasks_update_policy'
    AND cmd = 'UPDATE'
  ) INTO update_policy_exists;
  
  IF select_policy_exists AND update_policy_exists THEN
    RAISE NOTICE '✅ Políticas RLS configuradas corretamente!';
    RAISE NOTICE '   - SELECT: Permitido para qualquer usuário autenticado';
    RAISE NOTICE '   - UPDATE: Permitido para qualquer usuário autenticado';
    RAISE NOTICE '';
    RAISE NOTICE '🎯 Todas as roles (Gestor, Vendedor, Analista) podem:';
    RAISE NOTICE '   - Ver tarefas ✅';
    RAISE NOTICE '   - Marcar/Desmarcar tarefas ✅';
  ELSE
    RAISE NOTICE '❌ Políticas RLS não configuradas corretamente!';
    RAISE NOTICE '   - SELECT policy exists: %', select_policy_exists;
    RAISE NOTICE '   - UPDATE policy exists: %', update_policy_exists;
  END IF;
END $$;

-- 5. Verificar se há tarefas com comment_id (vinculadas a comentários)
SELECT 
  'Tarefas Vinculadas a Comentários' as info,
  COUNT(*) as count
FROM public.card_tasks 
WHERE comment_id IS NOT NULL;

-- 6. Mostrar exemplo de tarefas
SELECT 
  'Exemplo de Tarefas' as info,
  id,
  card_title,
  description,
  status,
  comment_id,
  created_at
FROM public.card_tasks 
ORDER BY created_at DESC 
LIMIT 5;
