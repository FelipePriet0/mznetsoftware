-- DEBUG: VERIFICAR ANEXOS NO STORAGE E TABELA
-- Execute este SQL para diagnosticar o problema

-- 1. VERIFICAR ARQUIVOS NO STORAGE
SELECT 
    name as file_path,
    bucket_id,
    created_at,
    updated_at,
    metadata
FROM storage.objects 
WHERE bucket_id = 'card-attachments'
ORDER BY created_at DESC
LIMIT 10;

-- 2. VERIFICAR REGISTROS NA TABELA card_attachments
SELECT 
    id,
    card_id,
    file_name,
    file_path,
    file_size,
    created_at,
    author_name
FROM public.card_attachments
ORDER BY created_at DESC
LIMIT 10;

-- 3. VERIFICAR COMENTÁRIOS DE ANEXO
SELECT 
    id,
    card_id,
    content,
    created_at,
    author_name
FROM public.card_comments
WHERE content LIKE '%📎 Anexo adicionado%'
ORDER BY created_at DESC
LIMIT 5;

-- 4. VERIFICAR CONFIGURAÇÃO DO BUCKET
SELECT 
    id,
    name,
    public,
    created_at
FROM storage.buckets
WHERE id = 'card-attachments';
