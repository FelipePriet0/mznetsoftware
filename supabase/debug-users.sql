-- =====================================================
-- DEBUG: Verificar se os usuários estão sendo carregados
-- =====================================================

-- 1. Verificar todos os usuários cadastrados
SELECT 
  'Usuários cadastrados' as info,
  id,
  full_name,
  role,
  email,
  created_at
FROM public.profiles
ORDER BY role, full_name;

-- 2. Verificar se há usuários com dados incompletos
SELECT 
  'Usuários com dados incompletos' as info,
  COUNT(*) as count
FROM public.profiles
WHERE full_name IS NULL 
   OR full_name = ''
   OR role IS NULL
   OR role = '';

-- 3. Verificar quantos usuários temos por role
SELECT 
  'Usuários por role' as info,
  role,
  COUNT(*) as count
FROM public.profiles
GROUP BY role
ORDER BY role;

-- 4. Verificar se a tabela profiles tem RLS ativo
SELECT 
  'RLS na tabela profiles' as info,
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE tablename = 'profiles';

-- 5. Verificar políticas RLS da tabela profiles
SELECT 
  'Políticas RLS da tabela profiles' as info,
  policyname,
  cmd,
  permissive,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY policyname;

-- 6. Testar se conseguimos fazer SELECT na tabela profiles
-- (simular o que o frontend faz)
SELECT 
  'Teste de SELECT profiles' as info,
  COUNT(*) as total_users,
  COUNT(CASE WHEN full_name IS NOT NULL THEN 1 END) as users_with_name,
  COUNT(CASE WHEN role IS NOT NULL THEN 1 END) as users_with_role
FROM public.profiles;

-- 7. Log de debug
DO $$
DECLARE
  user_count integer;
BEGIN
  SELECT COUNT(*) INTO user_count FROM public.profiles;
  
  RAISE NOTICE '🔍 Debug dos usuários executado!';
  RAISE NOTICE '📊 Total de usuários: %', user_count;
  
  IF user_count = 0 THEN
    RAISE NOTICE '❌ Nenhum usuário encontrado! Verifique se a tabela profiles tem dados.';
  ELSE
    RAISE NOTICE '✅ Usuários encontrados! Verifique os resultados acima.';
  END IF;
END $$;
