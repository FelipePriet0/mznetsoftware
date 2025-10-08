-- ============================================================
-- 🔍 DIAGNÓSTICO DE ANEXOS EM CONVERSAS ENCADEADAS (Supabase)
-- ============================================================
-- Como usar:
-- 1) Substitua o valor de CARD_ID pelo UUID real do card
-- 2) Rode cada seção e analise os resultados
-- ============================================================

-- 🧩 Parâmetros de teste (SUBSTITUA PELO SEU CARD)
-- SELECT '00000000-0000-0000-0000-000000000000'::uuid AS card_id \gset
-- Agora use :card_id nas queries (se editor suportar). Caso contrário, substitua manualmente.

-- 1) Verificar se tabela/colunas existem e estrutura básica
SELECT 
  '1. card_attachments columns' AS secao,
  column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'card_attachments'
ORDER BY ordinal_position;

SELECT 
  '1b. card_comments columns' AS secao,
  column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'card_comments'
ORDER BY ordinal_position;

-- 2) RLS e políticas para card_attachments e storage.objects
SELECT 
  '2. RLS card_attachments' AS secao,
  relrowsecurity AS rls_enabled
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relname = 'card_attachments';

SELECT 
  '2b. POLÍTICAS card_attachments' AS secao,
  policyname, cmd, qual AS using_expression, with_check AS check_expression
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'card_attachments'
ORDER BY policyname;

SELECT 
  '2c. RLS storage.objects' AS secao,
  (SELECT TRUE FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'storage' AND c.relname = 'objects' LIMIT 1) AS objects_exists;

SELECT 
  '2d. POLÍTICAS storage.objects (card-attachments)' AS secao,
  policyname, cmd, qual AS using_expression, with_check AS check_expression
FROM pg_policies
WHERE schemaname = 'storage' AND tablename = 'objects'
ORDER BY policyname;

-- 3) Bucket de storage
SELECT '3. Bucket card-attachments' AS secao, id, name, public
FROM storage.buckets
WHERE id = 'card-attachments';

-- 4) Triggers e funções ligadas a anexos
SELECT '4. TRIGGERS card_attachments' AS secao, trigger_name, event_manipulation, action_statement
FROM information_schema.triggers
WHERE event_object_schema = 'public' AND event_object_table = 'card_attachments'
ORDER BY trigger_name;

SELECT '4b. Funções auxiliares presentes?' AS secao, 
  p.proname AS function_name, pg_get_functiondef(p.oid) LIKE '%create_attachment_comment%' AS has_create_comment
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.proname IN ('create_attachment_comment', 'create_attachment_deletion_comment');

-- 5) Registros recentes de anexos do CARD (inclui vinculação com comentário)
-- Substitua :card_id pelo UUID do card
SELECT 
  '5. Anexos do card' AS secao,
  id, card_id, comment_id, file_name, file_path, file_extension, file_size,
  created_at, updated_at, deleted_at
FROM public.card_attachments
WHERE card_id = :card_id
ORDER BY created_at DESC
LIMIT 50;

-- 6) Comentários de anexo gerados (por trigger ou manualmente)
SELECT 
  '6. Comentários do card (anexos)' AS secao,
  id, card_id, content, created_at
FROM public.card_comments
WHERE card_id = :card_id 
  AND (
    content ILIKE '%Anexo adicionado:%' OR
    content ILIKE '%Arquivo anexado:%' OR
    content ILIKE '%Anexo removido:%'
  )
ORDER BY created_at DESC
LIMIT 50;

-- 7) Divergências entre Storage e Tabela (ver se o arquivo existe e se o path bate)
-- Observação: storage.objects.name contém o caminho relativo dentro do bucket
SELECT 
  '7. Conciliação storage x tabela' AS secao,
  ca.id AS attachment_id,
  ca.file_name,
  ca.file_path AS path_tabela,
  so.name AS path_storage,
  (so.name IS NOT NULL) AS existe_no_storage
FROM public.card_attachments ca
LEFT JOIN storage.objects so
  ON so.bucket_id = 'card-attachments' AND so.name = ca.file_path
WHERE ca.card_id = :card_id
ORDER BY ca.created_at DESC
LIMIT 50;

-- 8) Objetos no storage sob a “pasta” do CARD
SELECT 
  '8. Objetos no storage (prefixo CARD_ID/)' AS secao,
  name, created_at, last_accessed_at, metadata
FROM storage.objects
WHERE bucket_id = 'card-attachments'
  AND name LIKE (:card_id::text || '/%')
ORDER BY created_at DESC
LIMIT 100;

-- 9) Funções utilitárias (se presentes) e testes rápidos
SELECT '9. get_current_attachments existe?' AS secao,
  (SELECT TRUE FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace 
   WHERE n.nspname='public' AND p.proname='get_current_attachments') AS exists;

-- Se existir, teste:
-- SELECT * FROM public.get_current_attachments(:card_id);

-- 10) Simular SELECT do front (com filtro de soft delete)
EXPLAIN (VERBOSE, COSTS OFF)
SELECT * FROM public.card_attachments
WHERE card_id = :card_id AND deleted_at IS NULL
ORDER BY created_at ASC;

-- 11) Conferir se há anexos sem comment_id (precisam ser vinculados à conversa)
SELECT 
  '11. Anexos sem comment_id' AS secao,
  id, file_name, file_path, created_at
FROM public.card_attachments
WHERE card_id = :card_id AND comment_id IS NULL AND deleted_at IS NULL
ORDER BY created_at DESC
LIMIT 50;

-- 12) Conferir se o comentário de anexo está presente para o arquivo mais recente
WITH last_attachment AS (
  SELECT * FROM public.card_attachments 
  WHERE card_id = :card_id AND deleted_at IS NULL
  ORDER BY created_at DESC LIMIT 1
)
SELECT 
  '12. Comentário referente ao último anexo' AS secao,
  cc.id AS comment_id, cc.created_at, cc.content
FROM last_attachment la
LEFT JOIN public.card_comments cc 
  ON cc.card_id = la.card_id 
 AND (
   cc.id = la.comment_id OR 
   (cc.content ILIKE '%' || la.file_name || '%')
 )
ORDER BY cc.created_at DESC
LIMIT 5;

-- 13) Debug rápido do usuário atual
SELECT 
  '13. auth context' AS secao,
  auth.uid() AS current_user_id;

-- FIM

