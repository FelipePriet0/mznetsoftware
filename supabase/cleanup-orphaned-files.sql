-- =====================================================
-- SCRIPT PARA LIMPAR ARQUIVOS ÓRFÃOS NO STORAGE
-- Execute este script no Supabase SQL Editor
-- =====================================================

-- 1. IDENTIFICAR ARQUIVOS ÓRFÃOS (existem no Storage mas não no banco)
-- NOTA: Este script lista os arquivos que precisam ser removidos manualmente
-- pois não temos acesso direto ao Storage via SQL

-- 2. VERIFICAR ARQUIVOS DUPLICADOS NO BANCO
SELECT 
  'ARQUIVOS DUPLICADOS:' as status,
  file_path,
  COUNT(*) as count,
  array_agg(file_name) as file_names,
  array_agg(id) as attachment_ids
FROM card_attachments 
GROUP BY file_path
HAVING COUNT(*) > 1
ORDER BY count DESC;

-- 3. VERIFICAR ARQUIVOS COM PATHS INCORRETOS
SELECT 
  'PATHS INCORRETOS:' as status,
  id,
  file_path,
  file_name,
  card_title,
  created_at
FROM card_attachments 
WHERE file_path LIKE 'card-attachments/%'
   OR file_path NOT LIKE '%/%'
   OR (card_title IS NOT NULL AND file_path NOT LIKE card_title || '/%')
ORDER BY created_at DESC;

-- 4. ESTATÍSTICAS DE ORGANIZAÇÃO
SELECT 
  'ESTATÍSTICAS:' as status,
  COUNT(*) as total_attachments,
  COUNT(DISTINCT card_title) as unique_cards,
  COUNT(CASE WHEN file_path LIKE '%/%' THEN 1 END) as files_in_folders,
  COUNT(CASE WHEN file_path NOT LIKE '%/%' THEN 1 END) as files_in_root
FROM card_attachments;

-- 5. LISTAR TODAS AS PASTAS (CARDS) ÚNICAS
SELECT 
  'PASTAS DE CARDS:' as status,
  card_title,
  COUNT(*) as file_count,
  MIN(created_at) as first_file,
  MAX(created_at) as last_file
FROM card_attachments 
GROUP BY card_title
ORDER BY file_count DESC;

-- 6. CRIAR VIEW PARA MONITORAMENTO
CREATE OR REPLACE VIEW public.storage_organization_status AS
SELECT 
  'STORAGE_STATUS' as status,
  COUNT(*) as total_files,
  COUNT(DISTINCT card_title) as unique_folders,
  COUNT(CASE WHEN file_path LIKE '%/%' THEN 1 END) as properly_organized,
  COUNT(CASE WHEN file_path NOT LIKE '%/%' THEN 1 END) as needs_organization,
  ROUND(
    (COUNT(CASE WHEN file_path LIKE '%/%' THEN 1 END) * 100.0 / COUNT(*)), 2
  ) as organization_percentage
FROM card_attachments;

-- 7. CONSULTAR STATUS DA ORGANIZAÇÃO
SELECT * FROM public.storage_organization_status;

-- 8. COMENTÁRIO FINAL
SELECT 'Storage cleanup analysis complete!' as status;
