-- =====================================================
-- SCRIPT PARA ATUALIZAR FORMATO DOS COMENTÁRIOS DE ANEXO
-- Execute este script no Supabase SQL Editor
-- =====================================================

-- 1. ATUALIZAR FUNÇÃO DE COMENTÁRIO AUTOMÁTICO PARA FORMATO MAIS LIMPO
CREATE OR REPLACE FUNCTION public.create_attachment_comment()
RETURNS TRIGGER AS $$
DECLARE
  comment_content TEXT;
  card_title_text TEXT;
  file_size_formatted TEXT;
  file_icon TEXT;
BEGIN
  -- Buscar título do card
  SELECT title INTO card_title_text
  FROM public.kanban_cards 
  WHERE id = NEW.card_id;
  
  -- Formatar tamanho do arquivo
  file_size_formatted := pg_size_pretty(NEW.file_size);
  
  -- Definir ícone baseado na extensão
  file_icon := CASE 
    WHEN NEW.file_extension = 'pdf' THEN '📄'
    WHEN NEW.file_extension IN ('jpg', 'jpeg', 'png', 'gif', 'webp') THEN '🖼️'
    WHEN NEW.file_extension IN ('doc', 'docx') THEN '📝'
    WHEN NEW.file_extension IN ('xls', 'xlsx') THEN '📊'
    WHEN NEW.file_extension IN ('zip', 'rar', '7z') THEN '📦'
    WHEN NEW.file_extension IN ('mp4', 'avi', 'mov') THEN '🎥'
    WHEN NEW.file_extension IN ('mp3', 'wav', 'flac') THEN '🎵'
    ELSE '📎'
  END;
  
  -- Criar conteúdo do comentário no novo formato
  comment_content := file_icon || ' **' || NEW.file_name || '** ' || 
                     '(' || file_size_formatted || ') • ' ||
                     NEW.author_name || ' (' || NEW.author_role || ')' ||
                     (CASE WHEN NEW.description IS NOT NULL THEN E'\n' || '💬 ' || NEW.description ELSE '' END);

  -- Inserir comentário com título da ficha
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

-- 2. ATUALIZAR FUNÇÃO DE COMENTÁRIO DE REMOÇÃO
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
  -- Buscar título do card
  SELECT title INTO card_title_text
  FROM public.kanban_cards 
  WHERE id = OLD.card_id;
  
  -- Buscar informações do usuário atual
  SELECT full_name, role INTO v_author_name, v_author_role
  FROM public.profiles WHERE id = auth.uid();
  
  -- Formatar tamanho do arquivo
  file_size_formatted := pg_size_pretty(OLD.file_size);
  
  -- Definir ícone baseado na extensão
  file_icon := CASE 
    WHEN OLD.file_extension = 'pdf' THEN '📄'
    WHEN OLD.file_extension IN ('jpg', 'jpeg', 'png', 'gif', 'webp') THEN '🖼️'
    WHEN OLD.file_extension IN ('doc', 'docx') THEN '📝'
    WHEN OLD.file_extension IN ('xls', 'xlsx') THEN '📊'
    WHEN OLD.file_extension IN ('zip', 'rar', '7z') THEN '📦'
    WHEN OLD.file_extension IN ('mp4', 'avi', 'mov') THEN '🎥'
    WHEN OLD.file_extension IN ('mp3', 'wav', 'flac') THEN '🎵'
    ELSE '📎'
  END;
  
  -- Criar conteúdo do comentário de remoção
  comment_content := '🗑️ **' || OLD.file_name || '** ' || 
                     '(' || file_size_formatted || ') • **Removido por:** ' ||
                     v_author_name || ' (' || v_author_role || ')';

  -- Inserir comentário com título da ficha
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
-- VERIFICAÇÃO - Execute após aplicar as mudanças
-- =====================================================

-- Verificar se as funções foram atualizadas
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_name LIKE '%attachment%' 
AND routine_schema = 'public';

-- Testar com um novo upload para ver o novo formato
-- (Execute um upload de arquivo e verifique o comentário gerado)
