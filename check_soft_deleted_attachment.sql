-- Verificar se o anexo foi soft deleted
-- Execute este SQL no Supabase SQL Editor

-- Buscar o anexo especÃ­fico que foi deletado
SELECT 
    id,
    file_name,
    card_id,
    deleted_at,
    deleted_by,
    created_at
FROM card_attachments 
WHERE file_name LIKE '%03fb99ed-8eca-4efc-a78a-7d7367f18245_CTA_Adicionar_Tarefa_-_Comunicao_por_Card%'
ORDER BY created_at DESC;

-- Verificar todos os anexos soft deleted para este card
SELECT 
    id,
    file_name,
    deleted_at,
    deleted_by,
    CASE 
        WHEN deleted_at IS NULL THEN 'ATIVO'
        ELSE 'DELETADO (soft delete)'
    END as status
FROM card_attachments 
WHERE card_id = '4f27f130-f073-48d5-a964-ce2097a855f0'
ORDER BY created_at DESC;
