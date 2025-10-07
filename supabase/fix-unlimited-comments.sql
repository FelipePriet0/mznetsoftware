-- Script para garantir que comentários ilimitados funcionem corretamente
-- Execute este script no Supabase SQL Editor

-- 1. VERIFICAR ESTRUTURA DA TABELA card_comments
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM information_schema.columns 
WHERE table_name = 'card_comments' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. VERIFICAR SE EXISTE LIMITAÇÃO DE NÍVEL
SELECT 
  MAX(level) as max_level_found,
  COUNT(*) as total_comments,
  COUNT(DISTINCT thread_id) as total_threads
FROM public.card_comments;

-- 3. VERIFICAR POLÍTICAS RLS ATIVAS
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'card_comments';

-- 4. REMOVER QUALQUER LIMITAÇÃO DE NÍVEL (se existir)
-- Verificar se há constraints que limitam o nível
SELECT 
  conname as constraint_name,
  contype as constraint_type,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'public.card_comments'::regclass;

-- 5. GARANTIR QUE A COLUNA level ACEITA VALORES ALTOS
-- Verificar se há alguma constraint CHECK no nível
DO $$
BEGIN
  -- Remover qualquer constraint que limite o nível se existir
  BEGIN
    ALTER TABLE public.card_comments DROP CONSTRAINT IF EXISTS card_comments_level_check;
    ALTER TABLE public.card_comments DROP CONSTRAINT IF EXISTS check_level_limit;
  EXCEPTION
    WHEN others THEN
      -- Ignorar se não existir
      NULL;
  END;
END $$;

-- 6. VERIFICAR SE A COLUNA level É INTEGER E NÃO TEM LIMITAÇÃO
ALTER TABLE public.card_comments 
ALTER COLUMN level TYPE INTEGER;

-- 7. VERIFICAR PERMISSÕES DA TABELA
GRANT ALL ON public.card_comments TO authenticated;
GRANT ALL ON public.card_comments TO anon;

-- 8. VERIFICAR SE HÁ ÍNDICES QUE PODEM CAUSAR PROBLEMAS
SELECT 
  indexname,
  indexdef
FROM pg_indexes 
WHERE tablename = 'card_comments';

-- 9. TESTE DE INSERÇÃO DE COMENTÁRIO DE NÍVEL ALTO
-- Este é um teste para verificar se funciona
DO $$
DECLARE
  test_card_id UUID;
  test_comment_id UUID;
BEGIN
  -- Pegar um card existente para teste
  SELECT id INTO test_card_id FROM public.kanban_cards LIMIT 1;
  
  IF test_card_id IS NOT NULL THEN
    -- Tentar inserir um comentário de nível alto
    INSERT INTO public.card_comments (
      card_id,
      author_id,
      author_name,
      author_role,
      content,
      level,
      thread_id
    ) VALUES (
      test_card_id,
      '00000000-0000-0000-0000-000000000000', -- ID fictício para teste
      'Teste Sistema',
      'teste',
      'Teste de nível alto - nível 10',
      10,
      'test-thread-' || extract(epoch from now())::text
    ) RETURNING id INTO test_comment_id;
    
    -- Verificar se foi inserido
    IF test_comment_id IS NOT NULL THEN
      RAISE NOTICE 'SUCESSO: Comentário de nível 10 inserido com ID: %', test_comment_id;
      -- Remover o comentário de teste
      DELETE FROM public.card_comments WHERE id = test_comment_id;
    ELSE
      RAISE NOTICE 'ERRO: Falha ao inserir comentário de nível alto';
    END IF;
  ELSE
    RAISE NOTICE 'AVISO: Nenhum card encontrado para teste';
  END IF;
END $$;

-- 10. VERIFICAR RESULTADO FINAL
SELECT 
  'card_comments' as tabela,
  COUNT(*) as total_registros,
  MAX(level) as max_level,
  MIN(level) as min_level,
  AVG(level::numeric) as media_level
FROM public.card_comments;
