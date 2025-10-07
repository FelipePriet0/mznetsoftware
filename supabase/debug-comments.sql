-- Script para debugar problemas com respostas em níveis profundos

-- 1. Verificar estrutura da tabela card_comments
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'card_comments' 
ORDER BY ordinal_position;

-- 2. Verificar todos os comentários com suas hierarquias
SELECT 
    id,
    card_id,
    author_name,
    content,
    parent_id,
    level,
    thread_id,
    created_at,
    CASE 
        WHEN parent_id IS NULL THEN 'ROOT'
        ELSE 'REPLY'
    END as type,
    CASE 
        WHEN parent_id IS NULL THEN 'N/A'
        ELSE (SELECT author_name FROM card_comments WHERE id = cc.parent_id)
    END as parent_author
FROM card_comments cc
ORDER BY 
    COALESCE(thread_id, id), 
    level, 
    created_at;

-- 3. Verificar se há problemas com thread_id
SELECT 
    thread_id,
    COUNT(*) as comment_count,
    MIN(level) as min_level,
    MAX(level) as max_level,
    STRING_AGG(id::text, ', ' ORDER BY level, created_at) as comment_ids
FROM card_comments 
GROUP BY thread_id
ORDER BY thread_id;

-- 4. Verificar comentários órfãos (sem thread_id ou com thread_id inválido)
SELECT 
    id,
    author_name,
    level,
    thread_id,
    parent_id,
    created_at
FROM card_comments 
WHERE thread_id IS NULL 
   OR thread_id NOT IN (SELECT DISTINCT COALESCE(thread_id, id) FROM card_comments)
ORDER BY created_at;

-- 5. Verificar se há comentários com level > 7 (que deveriam estar bloqueados)
SELECT 
    id,
    author_name,
    level,
    thread_id,
    parent_id,
    created_at
FROM card_comments 
WHERE level > 7
ORDER BY created_at;

-- 6. Verificar constraints da tabela
SELECT 
    conname as constraint_name,
    contype as constraint_type,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'card_comments'::regclass;
