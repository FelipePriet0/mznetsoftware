-- =====================================================
-- DEBUG: Verificar se os usuÃ¡rios estÃ£o sendo carregados
-- =====================================================

-- 1. Verificar todos os usuÃ¡rios cadastrados
SELECT 
  'UsuÃ¡rios cadastrados' as info,
  id,
  full_name,
  role,
  email,
  created_at
FROM public.profiles
ORDER BY role, full_name;

-- 2. Verificar se hÃ¡ usuÃ¡rios com dados incompletos
SELECT 
  'UsuÃ¡rios com dados incompletos' as info,
  COUNT(*) as count
FROM public.profiles
WHERE full_name IS NULL 
   OR full_name = ''
   OR role IS NULL
   OR role = '';

-- 3. Verificar quantos usuÃ¡rios temos por role
SELECT 
  'UsuÃ¡rios por role' as info,
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

-- 5. Verificar polÃ­ticas RLS da tabela profiles
SELECT 
  'PolÃ­ticas RLS da tabela profiles' as info,
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
  
  RAISE NOTICE 'ðŸ” Debug dos usuÃ¡rios executado!';
  RAISE NOTICE 'ðŸ“Š Total de usuÃ¡rios: %', user_count;
  
  IF user_count = 0 THEN
    RAISE NOTICE 'âŒ Nenhum usuÃ¡rio encontrado! Verifique se a tabela profiles tem dados.';
  ELSE
    RAISE NOTICE 'âœ… UsuÃ¡rios encontrados! Verifique os resultados acima.';
  END IF;
END $$;
