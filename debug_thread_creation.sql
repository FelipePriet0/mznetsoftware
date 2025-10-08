-- DEBUG: Verificar se as threads estÃ£o sendo criadas corretamente
-- Execute este SQL no Supabase SQL Editor

-- 1. VERIFICAR COMENTÃRIOS COM THREADS
SELECT 
    id,
    content,
    level,
    thread_id,
    is_thread_starter,
    created_at,
    author_name
FROM card_comments 
WHERE content LIKE '%ðŸ“Ž%' 
   OR content LIKE '%Anexo adicionado%'
ORDER BY created_at DESC
LIMIT 10;

-- 2. VERIFICAR ESTRUTURA DAS THREADS
SELECT 
    thread_id,
    COUNT(*) as total_comments,
    SUM(CASE WHEN is_thread_starter = true THEN 1 ELSE 0 END) as thread_starters,
    MIN(created_at) as primeira_mensagem,
    MAX(created_at) as ultima_mensagem
FROM card_comments 
WHERE thread_id IS NOT NULL
GROUP BY thread_id
ORDER BY primeira_mensagem DESC
LIMIT 10;

-- 3. VERIFICAR ANEXOS VINCULADOS A COMENTÃRIOS
SELECT 
    ca.id as attachment_id,
    ca.file_name,
    ca.comment_id,
    cc.content as comment_content,
    cc.thread_id,
    cc.is_thread_starter,
    cc.created_at
FROM card_attachments ca
LEFT JOIN card_comments cc ON ca.comment_id = cc.id
WHERE ca.deleted_at IS NULL
ORDER BY ca.created_at DESC
LIMIT 10;

-- 4. VERIFICAR COMENTÃRIOS SEM THREAD_ID (PROBLEMA!)
SELECT 
    id,
    content,
    thread_id,
    is_thread_starter,
    created_at
FROM card_comments 
WHERE thread_id IS NULL
ORDER BY created_at DESC
LIMIT 5;
