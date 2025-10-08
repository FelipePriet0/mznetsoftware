-- =====================================================
-- SCRIPT PARA ATUALIZAR FORMATO DOS COMENTÃRIOS DE ANEXO
-- Execute este script no Supabase SQL Editor
-- =====================================================

-- 1. ATUALIZAR FUNÃ‡ÃƒO DE COMENTÃRIO AUTOMÃTICO PARA FORMATO MAIS LIMPO
CREATE OR REPLACE FUNCTION public.create_attachment_comment()
RETURNS TRIGGER AS $$
DECLARE
  comment_content TEXT;
  card_title_text TEXT;
  file_size_formatted TEXT;
  file_icon TEXT;
BEGIN
  -- Buscar tÃ­tulo do card
  SELECT title INTO card_title_text
  FROM public.kanban_cards 
  WHERE id = NEW.card_id;
  
  -- Formatar tamanho do arquivo
  file_size_formatted := pg_size_pretty(NEW.file_size);
  
  -- Definir Ã­cone baseado na extensÃ£o
  file_icon := CASE 
    WHEN NEW.file_extension = 'pdf' THEN 'ðŸ“„'
    WHEN NEW.file_extension IN ('jpg', 'jpeg', 'png', 'gif', 'webp') THEN 'ðŸ–¼ï¸'
    WHEN NEW.file_extension IN ('doc', 'docx') THEN 'ðŸ“'
    WHEN NEW.file_extension IN ('xls', 'xlsx') THEN 'ðŸ“Š'
    WHEN NEW.file_extension IN ('zip', 'rar', '7z') THEN 'ðŸ“¦'
    WHEN NEW.file_extension IN ('mp4', 'avi', 'mov') THEN 'ðŸŽ¥'
    WHEN NEW.file_extension IN ('mp3', 'wav', 'flac') THEN 'ðŸŽµ'
    ELSE 'ðŸ“Ž'
  END;
  
  -- Criar conteÃºdo do comentÃ¡rio no novo formato
  comment_content := file_icon || ' **' || NEW.file_name || '** ' || 
                     '(' || file_size_formatted || ') â€¢ ' ||
                     NEW.author_name || ' (' || NEW.author_role || ')' ||
                     (CASE WHEN NEW.description IS NOT NULL THEN E'\n' || 'ðŸ’¬ ' || NEW.description ELSE '' END);

  -- Inserir comentÃ¡rio com tÃ­tulo da ficha
  INSERT INTO public.card_comments (card_id, parent_id, author_id, author_name, author_role, content, level, card_title)
  VALUES (
    NEW.card_id,
    NULL,
    NEW.author_id,
    NEW.author_name,
    NEW.author_role,
    comment_content,
    0,
    card_title_text
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. ATUALIZAR FUNÃ‡ÃƒO DE COMENTÃRIO DE REMOÃ‡ÃƒO
CREATE OR REPLACE FUNCTION public.create_attachment_deletion_comment()
RETURNS TRIGGER AS $$
DECLARE
  comment_content TEXT;
  card_title_text TEXT;
  file_size_formatted TEXT;
  file_icon TEXT;
  v_author_name text;
  v_author_role text;
BEGIN
  -- Buscar tÃ­tulo do card
  SELECT title INTO card_title_text
  FROM public.kanban_cards 
  WHERE id = OLD.card_id;
  
  -- Buscar informaÃ§Ãµes do usuÃ¡rio atual
  SELECT full_name, role INTO v_author_name, v_author_role
  FROM public.profiles WHERE id = auth.uid();
  
  -- Formatar tamanho do arquivo
  file_size_formatted := pg_size_pretty(OLD.file_size);
  
  -- Definir Ã­cone baseado na extensÃ£o
  file_icon := CASE 
    WHEN OLD.file_extension = 'pdf' THEN 'ðŸ“„'
    WHEN OLD.file_extension IN ('jpg', 'jpeg', 'png', 'gif', 'webp') THEN 'ðŸ–¼ï¸'
    WHEN OLD.file_extension IN ('doc', 'docx') THEN 'ðŸ“'
    WHEN OLD.file_extension IN ('xls', 'xlsx') THEN 'ðŸ“Š'
    WHEN OLD.file_extension IN ('zip', 'rar', '7z') THEN 'ðŸ“¦'
    WHEN OLD.file_extension IN ('mp4', 'avi', 'mov') THEN 'ðŸŽ¥'
    WHEN OLD.file_extension IN ('mp3', 'wav', 'flac') THEN 'ðŸŽµ'
    ELSE 'ðŸ“Ž'
  END;
  
  -- Criar conteÃºdo do comentÃ¡rio de remoÃ§Ã£o
  comment_content := 'ðŸ—‘ï¸ **' || OLD.file_name || '** ' || 
                     '(' || file_size_formatted || ') â€¢ **Removido por:** ' ||
                     v_author_name || ' (' || v_author_role || ')';

  -- Inserir comentÃ¡rio com tÃ­tulo da ficha
  INSERT INTO public.card_comments (card_id, parent_id, author_id, author_name, author_role, content, level, card_title)
  VALUES (
    OLD.card_id,
    NULL,
    auth.uid(),
    v_author_name,
    v_author_role,
    comment_content,
    0,
    card_title_text
  );

  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- VERIFICAÃ‡ÃƒO - Execute apÃ³s aplicar as mudanÃ§as
-- =====================================================

-- Verificar se as funÃ§Ãµes foram atualizadas
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_name LIKE '%attachment%' 
AND routine_schema = 'public';

-- Testar com um novo upload para ver o novo formato
-- (Execute um upload de arquivo e verifique o comentÃ¡rio gerado)
