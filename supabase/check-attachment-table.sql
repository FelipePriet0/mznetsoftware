-- VERIFICAR DADOS NA TABELA card_attachments
SELECT 
    id,
    card_id,
    file_name,
    file_path,
    created_at,
    author_name
FROM public.card_attachments
ORDER BY created_at DESC
LIMIT 10;

-- VERIFICAR COMENTÁRIOS DE ANEXO
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
