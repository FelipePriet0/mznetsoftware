-- Script para corrigir a constraint de level na tabela card_comments
-- Execute este script no Supabase SQL Editor

-- 1. REMOVER A CONSTRAINT ATUAL
ALTER TABLE public.card_comments 
DROP CONSTRAINT IF EXISTS card_comments_level_check;

-- 2. ADICIONAR NOVA CONSTRAINT QUE PERMITE LEVELS DE 0 A 7
ALTER TABLE public.card_comments 
ADD CONSTRAINT card_comments_level_check CHECK (level >= 0 AND level <= 7);

-- 3. VERIFICAR SE A CONSTRAINT FOI APLICADA CORRETAMENTE
SELECT 
  conname as constraint_name,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'public.card_comments'::regclass 
  AND conname = 'card_comments_level_check';

-- 4. TESTAR INSERÇÃO COM LEVEL 5 (deve funcionar agora)
-- INSERT INTO public.card_comments (
--   card_id, 
--   author_id, 
--   author_name, 
--   content, 
--   level
-- ) VALUES (
--   '00000000-0000-0000-0000-000000000000', -- Substitua por um card_id válido
--   '00000000-0000-0000-0000-000000000000', -- Substitua por um author_id válido
--   'Teste',
--   'Teste de level 5',
--   5
-- );

-- 5. VERIFICAR COMENTÁRIOS EXISTENTES E SEUS LEVELS
SELECT 
  id,
  content,
  level,
  parent_id,
  thread_id,
  created_at
FROM public.card_comments 
ORDER BY created_at DESC 
LIMIT 10;
