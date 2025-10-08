-- TESTE COMPLETO DE SOFT DELETE DE ANEXOS
-- Execute este SQL no Supabase SQL Editor

-- 1. VERIFICAR ANEXOS SOFT DELETED (com deleted_at preenchido)
SELECT 
    'ANEXOS SOFT DELETED' as categoria,
    COUNT(*) as total,
    MIN(deleted_at) as primeiro_deletado,
    MAX(deleted_at) as ultimo_deletado
FROM card_attachments 
WHERE deleted_at IS NOT NULL;

-- 2. VERIFICAR ANEXOS ATIVOS (sem deleted_at)
SELECT 
    'ANEXOS ATIVOS' as categoria,
    COUNT(*) as total,
    MIN(created_at) as primeiro_criado,
    MAX(created_at) as ultimo_criado
FROM card_attachments 
WHERE deleted_at IS NULL;

-- 3. DETALHES DOS ANEXOS SOFT DELETED (Ãºltimos 10)
SELECT 
    id,
    file_name,
    file_size,
    file_extension,
    author_name,
    deleted_at,
    deleted_by,
    created_at,
    CASE 
        WHEN deleted_at IS NULL THEN 'ATIVO'
        ELSE 'SOFT DELETED'
    END as status
FROM card_attachments 
WHERE deleted_at IS NOT NULL
ORDER BY deleted_at DESC
LIMIT 10;

-- 4. DETALHES DOS ANEXOS ATIVOS (Ãºltimos 10)
SELECT 
    id,
    file_name,
    file_size,
    file_extension,
    author_name,
    created_at,
    CASE 
        WHEN deleted_at IS NULL THEN 'ATIVO'
        ELSE 'SOFT DELETED'
    END as status
FROM card_attachments 
WHERE deleted_at IS NULL
ORDER BY created_at DESC
LIMIT 10;

-- 5. RESUMO GERAL POR STATUS
SELECT 
    CASE 
        WHEN deleted_at IS NULL THEN 'ATIVO'
        ELSE 'SOFT DELETED'
    END as status,
    COUNT(*) as quantidade,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as porcentagem
FROM card_attachments 
GROUP BY 
    CASE 
        WHEN deleted_at IS NULL THEN 'ATIVO'
        ELSE 'SOFT DELETED'
    END
ORDER BY status;
