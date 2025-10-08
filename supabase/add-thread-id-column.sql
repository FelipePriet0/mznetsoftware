-- Script para adicionar coluna thread_id Ã  tabela card_comments
-- Execute este script no Supabase SQL Editor

-- 1. ADICIONAR COLUNA thread_id NA TABELA card_comments
ALTER TABLE public.card_comments 
ADD COLUMN IF NOT EXISTS thread_id text;

-- 2. CRIAR ÃNDICE PARA PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_card_comments_thread_id ON public.card_comments(thread_id);

-- 3. ATUALIZAR COMENTÃRIOS EXISTENTES COM thread_id
-- Para comentÃ¡rios principais (level = 0), usar o prÃ³prio ID como thread_id
UPDATE public.card_comments 
SET thread_id = id 
WHERE level = 0 AND thread_id IS NULL;

-- Para comentÃ¡rios de resposta (level > 0), usar o ID do comentÃ¡rio pai como thread_id
UPDATE public.card_comments 
SET thread_id = (
  SELECT c2.thread_id 
  FROM public.card_comments c2 
  WHERE c2.id = public.card_comments.parent_id
)
WHERE level > 0 AND thread_id IS NULL;

-- 4. DEFINIR CONSTRAINT PARA GARANTIR QUE thread_id NÃƒO SEJA NULL
ALTER TABLE public.card_comments 
ALTER COLUMN thread_id SET NOT NULL;

-- 5. VERIFICAR RESULTADO
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
