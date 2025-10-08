-- LIMPEZA COMPLETA DO STORAGE E RESET PARA TESTES
-- Execute este SQL no Supabase SQL Editor
-- âš ï¸ ATENÃ‡ÃƒO: Este script vai limpar TODOS os anexos do Storage!

-- 1. VERIFICAR ESTADO ATUAL DO STORAGE
SELECT 
    'ESTADO ATUAL' as status,
    COUNT(*) as total_anexos,
    SUM(CASE WHEN deleted_at IS NULL THEN 1 ELSE 0 END) as ativos,
    SUM(CASE WHEN deleted_at IS NOT NULL THEN 1 ELSE 0 END) as soft_deleted
FROM card_attachments;

-- 2. LISTAR ARQUIVOS NO STORAGE (Ãºltimos 10)
SELECT 
    id,
    file_name,
    file_path,
    file_size,
    created_at,
    CASE 
        WHEN deleted_at IS NULL THEN 'ATIVO'
        ELSE 'SOFT DELETED'
    END as status
FROM card_attachments 
ORDER BY created_at DESC
LIMIT 10;

-- 3. LIMPAR TODOS OS ANEXOS (HARD DELETE - REMOVER COMPLETAMENTE)
-- âš ï¸ CUIDADO: Isso vai remover TUDO do Storage!
DELETE FROM card_attachments;

-- 4. VERIFICAR SE FOI LIMPO
SELECT 
    'APÃ“S LIMPEZA' as status,
    COUNT(*) as total_anexos
FROM card_attachments;

-- 5. RESETAR SEQUÃŠNCIA (opcional - para IDs mais limpos)
-- ALTER SEQUENCE card_attachments_id_seq RESTART WITH 1;

-- 6. VERIFICAR STORAGE VAZIO
SELECT 
    'STORAGE LIMPO' as status,
    'Pronto para novos testes!' as mensagem;
