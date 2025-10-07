-- Script para testar inserção de comentários de nível alto
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

-- 2. VERIFICAR COMENTÁRIOS EXISTENTES E SEUS NÍVEIS
SELECT 
  'Comentários existentes' as info,
  id,
  content,
  level,
  parent_id,
  thread_id,
  created_at
FROM public.card_comments 
ORDER BY created_at DESC 
LIMIT 10;

-- 3. TESTE DE INSERÇÃO DE NÍVEL ALTO
DO $$
DECLARE
  test_card_id UUID;
  test_parent_id UUID;
  test_comment_id UUID;
  test_level INTEGER := 4; -- Testar nível 4
BEGIN
  -- Pegar um card existente
  SELECT id INTO test_card_id FROM public.kanban_cards LIMIT 1;
  
  -- Pegar um comentário existente como pai
  SELECT id INTO test_parent_id FROM public.card_comments WHERE level = 2 LIMIT 1;
  
  IF test_card_id IS NOT NULL THEN
    RAISE NOTICE 'Testando inserção de comentário nível %...', test_level;
    
    -- Tentar inserir comentário de nível alto
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
      '00000000-0000-0000-0000-000000000000', -- ID fictício
      'Teste Sistema',
      'teste',
      'Teste de nível ' || test_level,
      test_level,
      test_parent_id,
      'test-thread-' || extract(epoch from now())::text
    ) RETURNING id INTO test_comment_id;
    
    IF test_comment_id IS NOT NULL THEN
      RAISE NOTICE 'SUCESSO: Comentário nível % inserido com ID: %', test_level, test_comment_id;
      
      -- Verificar se foi realmente inserido
      SELECT level INTO test_level FROM public.card_comments WHERE id = test_comment_id;
      RAISE NOTICE 'Verificação: Comentário inserido com nível %', test_level;
      
      -- Remover o comentário de teste
      DELETE FROM public.card_comments WHERE id = test_comment_id;
      RAISE NOTICE 'Comentário de teste removido';
    ELSE
      RAISE NOTICE 'ERRO: Falha ao inserir comentário nível %', test_level;
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

-- 5. VERIFICAR POLÍTICAS RLS
SELECT 
  'Políticas RLS' as info,
  policyname,
  cmd,
  permissive,
  roles,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'card_comments';
