-- =====================================================
-- SCRIPT PARA VERIFICAR ANEXOS NO BANCO DE DADOS
-- Execute este script no Supabase SQL Editor
-- =====================================================

-- 1. Ver todos os anexos na tabela
SELECT 
  id,
  card_id,
  author_name,
  file_name,
  file_path,
  file_size,
  file_type,
  description,
  created_at
FROM public.card_attachments 
ORDER BY created_at DESC;

-- 2. Ver comentÃ¡rios automÃ¡ticos gerados
SELECT 
  card_id,
  author_name,
  content,
  created_at
FROM public.card_comments 
WHERE content LIKE '%ðŸ“Ž Anexo adicionado%' 
   OR content LIKE '%ðŸ—‘ï¸ Anexo removido%'
ORDER BY created_at DESC;

-- 3. Ver anexos de um card especÃ­fico (substitua pelo ID do seu card)
-- SELECT * FROM public.card_attachments WHERE card_id = 'SEU_CARD_ID_AQUI';

-- 4. Verificar se o bucket existe
SELECT * FROM storage.buckets WHERE id = 'card-attachments';

-- 5. Ver arquivos no storage (se possÃ­vel)
-- SELECT * FROM storage.objects WHERE bucket_id = 'card-attachments';
