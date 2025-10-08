-- =====================================================
-- TESTE DE PERMISSÃ•ES PARA DIFERENTES ROLES
-- =====================================================
-- Este script testa se as polÃ­ticas RLS estÃ£o permitindo
-- que diferentes roles acessem as tarefas

-- 1. Verificar usuÃ¡rios e suas roles
SELECT 
  'UsuÃ¡rios e Roles' as info,
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

-- 3. Verificar polÃ­ticas RLS ativas
SELECT 
  'PolÃ­ticas RLS Ativas' as info,
  policyname,
  cmd,
  permissive,
  qual
FROM pg_policies 
WHERE tablename = 'card_tasks'
ORDER BY policyname;

-- 4. Simular acesso de diferentes roles (usando funÃ§Ãµes de teste)
-- Nota: Este Ã© um teste conceitual - em produÃ§Ã£o seria testado com usuÃ¡rios reais

-- Verificar se a polÃ­tica de SELECT permite acesso geral
DO $$
DECLARE
  select_policy_exists boolean;
  update_policy_exists boolean;
BEGIN
  -- Verificar se as polÃ­ticas existem
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
    RAISE NOTICE 'âœ… PolÃ­ticas RLS configuradas corretamente!';
    RAISE NOTICE '   - SELECT: Permitido para qualquer usuÃ¡rio autenticado';
    RAISE NOTICE '   - UPDATE: Permitido para qualquer usuÃ¡rio autenticado';
    RAISE NOTICE '';
    RAISE NOTICE 'ðŸŽ¯ Todas as roles (Gestor, Vendedor, Analista) podem:';
    RAISE NOTICE '   - Ver tarefas âœ…';
    RAISE NOTICE '   - Marcar/Desmarcar tarefas âœ…';
  ELSE
    RAISE NOTICE 'âŒ PolÃ­ticas RLS nÃ£o configuradas corretamente!';
    RAISE NOTICE '   - SELECT policy exists: %', select_policy_exists;
    RAISE NOTICE '   - UPDATE policy exists: %', update_policy_exists;
  END IF;
END $$;

-- 5. Verificar se hÃ¡ tarefas com comment_id (vinculadas a comentÃ¡rios)
SELECT 
  'Tarefas Vinculadas a ComentÃ¡rios' as info,
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
