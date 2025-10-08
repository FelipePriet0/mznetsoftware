-- =====================================================
-- SCRIPT PARA CORRIGIR ORGANIZAÃ‡ÃƒO DO STORAGE
-- Execute este script no Supabase SQL Editor
-- =====================================================

-- 1. VERIFICAR ARQUIVOS QUE ESTÃƒO FORA DAS PASTAS DOS CARDS
SELECT 
  'ARQUIVOS FORA DAS PASTAS:' as status,
  file_path,
  file_name,
  card_title,
  created_at
FROM card_attachments 
WHERE file_path NOT LIKE '%/%'
   OR file_path LIKE 'card-attachments/%'
ORDER BY created_at DESC;

-- 2. VERIFICAR CARDS SEM TÃTULO
SELECT 
  'CARDS SEM TÃTULO:' as status,
  id,
  title,
  created_at
FROM kanban_cards 
WHERE title IS NULL 
   OR title = ''
   OR title = 'Card';

-- 3. ATUALIZAR file_path DOS ARQUIVOS MAL ORGANIZADOS
-- Para arquivos que estÃ£o na raiz do bucket
UPDATE card_attachments 
SET file_path = card_title || '/' || file_name
WHERE file_path NOT LIKE '%/%'
   OR file_path LIKE 'card-attachments/%';

-- 4. ATUALIZAR file_path PARA CARDS SEM TÃTULO
UPDATE card_attachments 
SET file_path = 'CARDS_SEM_TITULO/' || file_name,
    card_title = 'CARDS_SEM_TITULO'
WHERE card_title IS NULL 
   OR card_title = ''
   OR card_title = 'Card';

-- 5. VERIFICAR RESULTADO DA CORREÃ‡ÃƒO
SELECT 
  'RESULTADO APÃ“S CORREÃ‡ÃƒO:' as status,
  file_path,
  file_name,
  card_title,
  created_at
FROM card_attachments 
ORDER BY created_at DESC
LIMIT 20;

-- 6. CRIAR FUNÃ‡ÃƒO PARA VALIDAR ESTRUTURA DE PASTAS
CREATE OR REPLACE FUNCTION public.validate_storage_structure()
RETURNS TABLE (
  issue_type TEXT,
  file_path TEXT,
  file_name TEXT,
  card_title TEXT,
  recommendation TEXT
) AS $$
BEGIN
  RETURN QUERY
  -- Arquivos na raiz (sem pasta de card)
  SELECT 
    'FILE_IN_ROOT'::TEXT,
    ca.file_path,
    ca.file_name,
    ca.card_title,
    'Move to: ' || ca.card_title || '/' || ca.file_name
  FROM card_attachments ca
  WHERE ca.file_path NOT LIKE '%/%'
  
  UNION ALL
  
  -- Arquivos com prefixo card-attachments duplicado
  SELECT 
    'DUPLICATE_PREFIX'::TEXT,
    ca.file_path,
    ca.file_name,
    ca.card_title,
    'Fix to: ' || ca.card_title || '/' || ca.file_name
  FROM card_attachments ca
  WHERE ca.file_path LIKE 'card-attachments/%'
  
  UNION ALL
  
  -- Cards sem tÃ­tulo
  SELECT 
    'CARD_NO_TITLE'::TEXT,
    ca.file_path,
    ca.file_name,
    ca.card_title,
    'Assign proper card title'
  FROM card_attachments ca
  WHERE ca.card_title IS NULL 
     OR ca.card_title = ''
     OR ca.card_title = 'Card';
END;
$$ LANGUAGE plpgsql;

-- 7. EXECUTAR VALIDAÃ‡ÃƒO
SELECT * FROM public.validate_storage_structure();

-- 8. COMENTÃRIO FINAL
SELECT 'Storage organization validation complete!' as status;
