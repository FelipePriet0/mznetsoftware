-- LIMPEZA COMPLETA DO SUPABASE STORAGE
-- Execute este SQL no Supabase SQL Editor
-- âš ï¸ ATENÃ‡ÃƒO: Este script vai limpar TODOS os arquivos do Storage!

-- 1. VERIFICAR ARQUIVOS NO STORAGE
SELECT 
    name,
    bucket_id,
    created_at,
    updated_at,
    metadata
FROM storage.objects 
ORDER BY created_at DESC;

-- 2. CONTAR ARQUIVOS NO STORAGE
SELECT 
    'ARQUIVOS NO STORAGE' as status,
    COUNT(*) as total_arquivos
FROM storage.objects;

-- 3. LISTAR BUCKETS DISPONÃVEIS
SELECT 
    id as bucket_id,
    name as bucket_name,
    public as is_public,
    created_at
FROM storage.buckets;

-- 4. LIMPAR TODOS OS ARQUIVOS DO STORAGE
-- âš ï¸ CUIDADO: Isso vai remover TODOS os arquivos!
DELETE FROM storage.objects;

-- 5. VERIFICAR SE FOI LIMPO
SELECT 
    'APÃ“S LIMPEZA' as status,
    COUNT(*) as total_arquivos
FROM storage.objects;

-- 6. CONFIRMAÃ‡ÃƒO FINAL
SELECT 
    'STORAGE COMPLETAMENTE LIMPO' as status,
    'Todos os arquivos foram removidos!' as mensagem;
