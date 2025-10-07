-- Script para corrigir valores NULL na coluna thread_id
-- Execute este script no Supabase SQL Editor

-- 1. PRIMEIRO: POPULAR TODOS OS thread_id NULL
-- Para comentários principais (level = 0), usar o próprio ID como thread_id
UPDATE public.card_comments 
SET thread_id = id 
WHERE level = 0 AND thread_id IS NULL;

-- 2. PARA COMENTÁRIOS DE RESPOSTA (level > 0), usar o thread_id do comentário pai
-- Primeiro, vamos atualizar em múltiplas passadas para garantir que todos sejam populados
DO $$
DECLARE
    updated_count INTEGER;
BEGIN
    LOOP
        -- Atualizar comentários que têm parent_id com thread_id definido
        UPDATE public.card_comments 
        SET thread_id = (
            SELECT c2.thread_id 
            FROM public.card_comments c2 
            WHERE c2.id = public.card_comments.parent_id
            AND c2.thread_id IS NOT NULL
        )
        WHERE level > 0 
        AND thread_id IS NULL 
        AND parent_id IS NOT NULL
        AND EXISTS (
            SELECT 1 FROM public.card_comments c2 
            WHERE c2.id = public.card_comments.parent_id 
            AND c2.thread_id IS NOT NULL
        );
        
        GET DIAGNOSTICS updated_count = ROW_COUNT;
        
        -- Se não atualizou nenhum registro, sair do loop
        EXIT WHEN updated_count = 0;
    END LOOP;
    
    -- Para qualquer comentário que ainda tenha thread_id NULL, usar o próprio ID
    UPDATE public.card_comments 
    SET thread_id = id 
    WHERE thread_id IS NULL;
END $$;

-- 3. VERIFICAR SE AINDA EXISTEM VALORES NULL
SELECT 
    COUNT(*) as total_comments,
    COUNT(thread_id) as comments_with_thread_id,
    COUNT(*) - COUNT(thread_id) as null_thread_ids
FROM public.card_comments;

-- 4. SE NÃO HOUVER VALORES NULL, DEFINIR CONSTRAINT NOT NULL
DO $$
BEGIN
    -- Verificar se existem valores NULL
    IF NOT EXISTS (
        SELECT 1 FROM public.card_comments 
        WHERE thread_id IS NULL
    ) THEN
        -- Se não há valores NULL, definir constraint NOT NULL
        ALTER TABLE public.card_comments 
        ALTER COLUMN thread_id SET NOT NULL;
        
        RAISE NOTICE 'Constraint NOT NULL aplicada com sucesso na coluna thread_id';
    ELSE
        RAISE NOTICE 'Ainda existem valores NULL na coluna thread_id. Execute novamente este script.';
    END IF;
END $$;

-- 5. VERIFICAR RESULTADO FINAL
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
