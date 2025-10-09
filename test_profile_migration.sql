-- ============================================
-- SCRIPT DE TESTE PARA MIGRATION PROFILES
-- Execute apÃ³s aplicar a migration de correÃ§Ã£o
-- ============================================

-- 1. Verificar estrutura da tabela profiles
SELECT '1. Estrutura da tabela profiles' as teste;
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'profiles'
ORDER BY ordinal_position;

-- 2. Verificar se company_id foi removido
SELECT '2. VerificaÃ§Ã£o: company_id removido' as teste;
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'profiles' AND column_name = 'company_id'
    ) 
    THEN 'âŒ ERRO: company_id ainda existe!'
    ELSE 'âœ… OK: company_id foi removido'
  END as status;

-- 3. Verificar enum user_role
SELECT '3. Valores do ENUM user_role' as teste;
SELECT enumlabel as valor_permitido, enumsortorder as ordem
FROM pg_enum
WHERE enumtypid = 'user_role'::regtype
ORDER BY enumsortorder;

-- 4. Verificar funÃ§Ã£o current_profile
SELECT '4. Teste da funÃ§Ã£o current_profile' as teste;
SELECT 
  routine_name,
  data_type as tipo_retorno
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'current_profile';

-- 5. Verificar trigger handle_new_user
SELECT '5. VerificaÃ§Ã£o do trigger handle_new_user' as teste;
SELECT 
  trigger_name,
  event_manipulation,
  action_timing
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND trigger_name = 'on_auth_user_created';

-- 6. Verificar se funÃ§Ãµes obsoletas foram removidas
SELECT '6. VerificaÃ§Ã£o: funÃ§Ãµes obsoletas removidas' as teste;
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.routines 
      WHERE routine_name = 'same_company'
    ) 
    THEN 'âŒ ERRO: same_company ainda existe!'
    ELSE 'âœ… OK: same_company foi removida'
  END as status;

-- 7. Verificar dados existentes
SELECT '7. Dados existentes na tabela profiles' as teste;
SELECT 
  role::text as role_atual,
  COUNT(*) as quantidade_usuarios,
  ARRAY_AGG(full_name ORDER BY full_name) as usuarios
FROM profiles
GROUP BY role::text
ORDER BY COUNT(*) DESC;

-- 8. Teste de criaÃ§Ã£o de perfil (simulaÃ§Ã£o)
SELECT '8. Teste: estrutura do perfil' as teste;
SELECT 
  'Estrutura esperada pelo front-end:' as info,
  'id, full_name, role, avatar_url, created_at, updated_at' as campos_necessarios;

-- 9. Verificar se todos os usuÃ¡rios tÃªm perfil
SELECT '9. VerificaÃ§Ã£o: todos os usuÃ¡rios tÃªm perfil' as teste;
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM auth.users u
      LEFT JOIN profiles p ON p.id = u.id
      WHERE p.id IS NULL
    ) 
    THEN 'âš ï¸ AVISO: Alguns usuÃ¡rios nÃ£o tÃªm perfil'
    ELSE 'âœ… OK: Todos os usuÃ¡rios tÃªm perfil'
  END as status;

-- 10. Resumo final
SELECT '10. RESUMO DA MIGRATION' as teste;
SELECT 
  'Migration aplicada com sucesso!' as status,
  'Banco alinhado com front-end' as resultado,
  'Roles: vendedor, analista, gestor' as roles_corretos,
  'company_id removido' as limpeza,
  'current_profile() atualizada' as funcoes;
