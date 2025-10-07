-- DEBUG: VERIFICAR CAMINHOS DOS ARQUIVOS NO STORAGE VS TABELA

-- 1. VERIFICAR ARQUIVOS NO STORAGE
SELECT 
    'STORAGE' as source,
    name as file_path,
    bucket_id,
    created_at,
    updated_at
FROM storage.objects 
WHERE bucket_id = 'card-attachments'
ORDER BY created_at DESC
LIMIT 10;

-- 2. VERIFICAR REGISTROS NA TABELA card_attachments
SELECT 
    'TABLE' as source,
    file_path,
    file_name,
    created_at,
    author_name
FROM public.card_attachments
ORDER BY created_at DESC
LIMIT 10;

-- 3. VERIFICAR COMENTÁRIOS DE ANEXO
SELECT 
    'COMMENT' as source,
    id,
    content,
    created_at,
    author_name
FROM public.card_comments
WHERE content LIKE '%📎 Anexo adicionado%'
ORDER BY created_at DESC
LIMIT 5;

-- 4. COMPARAR CAMINHOS (STORAGE vs TABLE)
SELECT 
    s.name as storage_path,
    t.file_path as table_path,
    t.file_name,
    CASE 
        WHEN s.name = t.file_path THEN 'MATCH'
        ELSE 'MISMATCH'
    END as status
FROM storage.objects s
FULL OUTER JOIN public.card_attachments t ON s.name = t.file_path
WHERE s.bucket_id = 'card-attachments' OR t.file_path IS NOT NULL
ORDER BY s.created_at DESC
LIMIT 10;
