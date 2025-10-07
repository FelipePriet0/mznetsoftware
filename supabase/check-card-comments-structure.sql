-- =====================================================
-- SCRIPT PARA VERIFICAR ESTRUTURA DA TABELA card_comments
-- Execute este script no Supabase SQL Editor para diagnosticar problemas
-- =====================================================

-- 1. VERIFICAR ESTRUTURA DA TABELA card_comments
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default,
  character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'card_comments' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. VERIFICAR CONSTRAINTS (incluindo NOT NULL)
SELECT 
  conname as constraint_name,
  contype as constraint_type,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'public.card_comments'::regclass;

-- 3. VERIFICAR SE AS FUNÇÕES EXISTEM
SELECT 
  routine_name,
  routine_type,
  data_type as return_type
FROM information_schema.routines 
WHERE routine_name IN (
  'create_attachment_comment',
  'create_attachment_deletion_comment'
) AND routine_schema = 'public';

-- 4. VERIFICAR SE OS TRIGGERS EXISTEM
SELECT 
  trigger_name,
  event_manipulation,
  action_timing,
  action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'card_comments'
  AND event_object_schema = 'public';

-- 5. VERIFICAR REGISTROS COM thread_id NULL (se existirem)
SELECT 
  COUNT(*) as total_comments,
  COUNT(thread_id) as comments_with_thread_id,
  COUNT(*) - COUNT(thread_id) as comments_without_thread_id
FROM public.card_comments;

-- 6. MOSTRAR ALGUNS EXEMPLOS DE COMENTÁRIOS RECENTES
SELECT 
  id,
  card_id,
  author_name,
  content,
  thread_id,
  parent_id,
  level,
  is_thread_starter,
  created_at
FROM public.card_comments 
ORDER BY created_at DESC 
LIMIT 5;
