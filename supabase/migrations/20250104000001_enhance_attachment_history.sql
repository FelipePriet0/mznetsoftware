-- Enhance attachment history and add utility functions
-- This migration adds additional functions for better attachment management

-- 1. Function to get attachment history for a card
CREATE OR REPLACE FUNCTION public.get_attachment_history(card_uuid UUID)
RETURNS TABLE (
  id UUID,
  action TEXT,
  file_name TEXT,
  file_type TEXT,
  file_size BIGINT,
  description TEXT,
  author_name TEXT,
  author_role TEXT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cc.id,
    CASE 
      WHEN cc.content LIKE 'ðŸ“Ž Anexo adicionado:%' THEN 'uploaded'
      WHEN cc.content LIKE 'ðŸ—‘ï¸ Anexo removido:%' THEN 'deleted'
      ELSE 'unknown'
    END as action,
    CASE 
      WHEN cc.content LIKE 'ðŸ“Ž Anexo adicionado:%' THEN 
        TRIM(SPLIT_PART(SPLIT_PART(cc.content, 'ðŸ“Ž Anexo adicionado: ', 2), E'\n', 1))
      WHEN cc.content LIKE 'ðŸ—‘ï¸ Anexo removido:%' THEN 
        TRIM(SPLIT_PART(SPLIT_PART(cc.content, 'ðŸ—‘ï¸ Anexo removido: ', 2), E'\n', 1))
      ELSE NULL
    END as file_name,
    CASE 
      WHEN cc.content LIKE '%â€¢ Tipo: %' THEN 
        TRIM(SPLIT_PART(SPLIT_PART(cc.content, 'â€¢ Tipo: ', 2), E'\n', 1))
      ELSE NULL
    END as file_type,
    CASE 
      WHEN cc.content LIKE '%â€¢ Tamanho: %' THEN 
        CAST(TRIM(SPLIT_PART(SPLIT_PART(cc.content, 'â€¢ Tamanho: ', 2), ' bytes', 1)) AS BIGINT)
      ELSE NULL
    END as file_size,
    CASE 
      WHEN cc.content LIKE '%ðŸ“ DescriÃ§Ã£o: %' THEN 
        TRIM(SPLIT_PART(SPLIT_PART(cc.content, 'ðŸ“ DescriÃ§Ã£o: ', 2), E'\n\n', 1))
      ELSE NULL
    END as description,
    cc.author_name,
    cc.author_role,
    cc.created_at
  FROM public.card_comments cc
  WHERE cc.card_id = card_uuid
    AND (cc.content LIKE 'ðŸ“Ž Anexo adicionado:%' OR cc.content LIKE 'ðŸ—‘ï¸ Anexo removido:%')
  ORDER BY cc.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- 2. Function to get current attachments for a card
CREATE OR REPLACE FUNCTION public.get_current_attachments(card_uuid UUID)
RETURNS TABLE (
  id UUID,
  file_name TEXT,
  file_type TEXT,
  file_size BIGINT,
  file_extension TEXT,
  description TEXT,
  author_name TEXT,
  author_role TEXT,
  created_at TIMESTAMPTZ,
  download_url TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ca.id,
    ca.file_name,
    ca.file_type,
    ca.file_size,
    ca.file_extension,
    ca.description,
    ca.author_name,
    ca.author_role,
    ca.created_at,
    storage.get_public_url('card-attachments', ca.file_path) as download_url
  FROM public.card_attachments ca
  WHERE ca.card_id = card_uuid
  ORDER BY ca.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- 3. Function to clean up orphaned attachments (files without database records)
CREATE OR REPLACE FUNCTION public.cleanup_orphaned_attachments()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER := 0;
  file_record RECORD;
BEGIN
  -- Find files in storage that don't have corresponding database records
  FOR file_record IN 
    SELECT name, created_at
    FROM storage.objects 
    WHERE bucket_id = 'card-attachments'
      AND created_at < NOW() - INTERVAL '1 hour' -- Only files older than 1 hour
      AND NOT EXISTS (
        SELECT 1 FROM public.card_attachments ca 
        WHERE ca.file_path = file_record.name
      )
  LOOP
    -- Delete the orphaned file
    DELETE FROM storage.objects 
    WHERE bucket_id = 'card-attachments' 
      AND name = file_record.name;
    
    deleted_count := deleted_count + 1;
  END LOOP;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- 4. Add index for better performance on attachment comments
CREATE INDEX IF NOT EXISTS idx_card_comments_attachment_actions 
ON public.card_comments (card_id, created_at) 
WHERE content LIKE 'ðŸ“Ž Anexo adicionado:%' OR content LIKE 'ðŸ—‘ï¸ Anexo removido:%';

-- 5. Add function to get attachment statistics for a card
CREATE OR REPLACE FUNCTION public.get_attachment_stats(card_uuid UUID)
RETURNS TABLE (
  total_files BIGINT,
  total_size BIGINT,
  file_types JSONB,
  authors JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) as total_files,
    COALESCE(SUM(ca.file_size), 0) as total_size,
    jsonb_object_agg(
      ca.file_extension, 
      jsonb_build_object(
        'count', file_count,
        'total_size', total_size
      )
    ) as file_types,
    jsonb_object_agg(
      ca.author_name,
      jsonb_build_object(
        'role', ca.author_role,
        'count', author_count
      )
    ) as authors
  FROM public.card_attachments ca
  LEFT JOIN (
    SELECT 
      file_extension,
      COUNT(*) as file_count,
      SUM(file_size) as total_size
    FROM public.card_attachments 
    WHERE card_id = card_uuid
    GROUP BY file_extension
  ) ft ON ft.file_extension = ca.file_extension
  LEFT JOIN (
    SELECT 
      author_name,
      COUNT(*) as author_count
    FROM public.card_attachments 
    WHERE card_id = card_uuid
    GROUP BY author_name
  ) au ON au.author_name = ca.author_name
  WHERE ca.card_id = card_uuid
  GROUP BY ca.card_id;
END;
$$ LANGUAGE plpgsql;

-- 6. Grant permissions for the new functions
GRANT EXECUTE ON FUNCTION public.get_attachment_history(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_current_attachments(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_attachment_stats(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_orphaned_attachments() TO authenticated;
