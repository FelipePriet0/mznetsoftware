-- Script para garantir que comentÃ¡rios ilimitados funcionem corretamente
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

-- 2. VERIFICAR SE EXISTE LIMITAÃ‡ÃƒO DE NÃVEL
SELECT 
  MAX(level) as max_level_found,
  COUNT(*) as total_comments,
  COUNT(DISTINCT thread_id) as total_threads
FROM public.card_comments;

-- 3. VERIFICAR POLÃTICAS RLS ATIVAS
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

-- 4. REMOVER QUALQUER LIMITAÃ‡ÃƒO DE NÃVEL (se existir)
-- Verificar se hÃ¡ constraints que limitam o nÃ­vel
SELECT 
  conname as constraint_name,
  contype as constraint_type,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'public.card_comments'::regclass;

-- 5. GARANTIR QUE A COLUNA level ACEITA VALORES ALTOS
-- Verificar se hÃ¡ alguma constraint CHECK no nÃ­vel
DO $$
BEGIN
  -- Remover qualquer constraint que limite o nÃ­vel se existir
  BEGIN
    ALTER TABLE public.card_comments DROP CONSTRAINT IF EXISTS card_comments_level_check;
    ALTER TABLE public.card_comments DROP CONSTRAINT IF EXISTS check_level_limit;
  EXCEPTION
    WHEN others THEN
      -- Ignorar se nÃ£o existir
      NULL;
  END;
END $$;

-- 6. VERIFICAR SE A COLUNA level Ã‰ INTEGER E NÃƒO TEM LIMITAÃ‡ÃƒO
ALTER TABLE public.card_comments 
ALTER COLUMN level TYPE INTEGER;

-- 7. VERIFICAR PERMISSÃ•ES DA TABELA
GRANT ALL ON public.card_comments TO authenticated;
GRANT ALL ON public.card_comments TO anon;

-- 8. VERIFICAR SE HÃ ÃNDICES QUE PODEM CAUSAR PROBLEMAS
SELECT 
  indexname,
  indexdef
FROM pg_indexes 
WHERE tablename = 'card_comments';

-- 9. TESTE DE INSERÃ‡ÃƒO DE COMENTÃRIO DE NÃVEL ALTO
-- Este Ã© um teste para verificar se funciona
DO $$
DECLARE
  test_card_id UUID;
  test_comment_id UUID;
BEGIN
  -- Pegar um card existente para teste
  SELECT id INTO test_card_id FROM public.kanban_cards LIMIT 1;
  
  IF test_card_id IS NOT NULL THEN
    -- Tentar inserir um comentÃ¡rio de nÃ­vel alto
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
      '00000000-0000-0000-0000-000000000000', -- ID fictÃ­cio para teste
      'Teste Sistema',
      'teste',
      'Teste de nÃ­vel alto - nÃ­vel 10',
      10,
      'test-thread-' || extract(epoch from now())::text
    ) RETURNING id INTO test_comment_id;
    
    -- Verificar se foi inserido
    IF test_comment_id IS NOT NULL THEN
      RAISE NOTICE 'SUCESSO: ComentÃ¡rio de nÃ­vel 10 inserido com ID: %', test_comment_id;
      -- Remover o comentÃ¡rio de teste
      DELETE FROM public.card_comments WHERE id = test_comment_id;
    ELSE
      RAISE NOTICE 'ERRO: Falha ao inserir comentÃ¡rio de nÃ­vel alto';
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
