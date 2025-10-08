-- Script para testar inserÃ§Ã£o de comentÃ¡rios de nÃ­vel alto
-- Execute este script no Supabase SQL Editor

-- 1. VERIFICAR ESTRUTURA ATUAL
SELECT 
  'Estrutura da tabela' as info,
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'card_comments' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. VERIFICAR COMENTÃRIOS EXISTENTES E SEUS NÃVEIS
SELECT 
  'ComentÃ¡rios existentes' as info,
  id,
  content,
  level,
  parent_id,
  thread_id,
  created_at
FROM public.card_comments 
ORDER BY created_at DESC 
LIMIT 10;

-- 3. TESTE DE INSERÃ‡ÃƒO DE NÃVEL ALTO
DO $$
DECLARE
  test_card_id UUID;
  test_parent_id UUID;
  test_comment_id UUID;
  test_level INTEGER := 4; -- Testar nÃ­vel 4
BEGIN
  -- Pegar um card existente
  SELECT id INTO test_card_id FROM public.kanban_cards LIMIT 1;
  
  -- Pegar um comentÃ¡rio existente como pai
  SELECT id INTO test_parent_id FROM public.card_comments WHERE level = 2 LIMIT 1;
  
  IF test_card_id IS NOT NULL THEN
    RAISE NOTICE 'Testando inserÃ§Ã£o de comentÃ¡rio nÃ­vel %...', test_level;
    
    -- Tentar inserir comentÃ¡rio de nÃ­vel alto
    INSERT INTO public.card_comments (
      card_id,
      author_id,
      author_name,
      author_role,
      content,
      level,
      parent_id,
      thread_id
    ) VALUES (
      test_card_id,
      '00000000-0000-0000-0000-000000000000', -- ID fictÃ­cio
      'Teste Sistema',
      'teste',
      'Teste de nÃ­vel ' || test_level,
      test_level,
      test_parent_id,
      'test-thread-' || extract(epoch from now())::text
    ) RETURNING id INTO test_comment_id;
    
    IF test_comment_id IS NOT NULL THEN
      RAISE NOTICE 'SUCESSO: ComentÃ¡rio nÃ­vel % inserido com ID: %', test_level, test_comment_id;
      
      -- Verificar se foi realmente inserido
      SELECT level INTO test_level FROM public.card_comments WHERE id = test_comment_id;
      RAISE NOTICE 'VerificaÃ§Ã£o: ComentÃ¡rio inserido com nÃ­vel %', test_level;
      
      -- Remover o comentÃ¡rio de teste
      DELETE FROM public.card_comments WHERE id = test_comment_id;
      RAISE NOTICE 'ComentÃ¡rio de teste removido';
    ELSE
      RAISE NOTICE 'ERRO: Falha ao inserir comentÃ¡rio nÃ­vel %', test_level;
    END IF;
  ELSE
    RAISE NOTICE 'ERRO: Nenhum card encontrado para teste';
  END IF;
END $$;

-- 4. VERIFICAR CONSTRAINTS QUE PODEM LIMITAR
SELECT 
  'Constraints da tabela' as info,
  conname as constraint_name,
  contype as constraint_type,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'public.card_comments'::regclass;

-- 5. VERIFICAR POLÃTICAS RLS
SELECT 
  'PolÃ­ticas RLS' as info,
  policyname,
  cmd,
  permissive,
  roles,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'card_comments';
