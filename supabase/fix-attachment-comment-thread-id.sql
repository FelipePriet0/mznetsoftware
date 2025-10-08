-- =====================================================
-- SCRIPT PARA CORRIGIR THREAD_ID EM COMENTÃRIOS DE ANEXO
-- Execute este script no Supabase SQL Editor
-- =====================================================

-- 1. ATUALIZAR FUNÃ‡ÃƒO DE COMENTÃRIO AUTOMÃTICO PARA INCLUIR THREAD_ID
CREATE OR REPLACE FUNCTION public.create_attachment_comment()
RETURNS TRIGGER AS $$
DECLARE
  comment_content TEXT;
  card_title_text TEXT;
  new_thread_id TEXT;
BEGIN
  -- Buscar tÃ­tulo do card
  SELECT title INTO card_title_text
  FROM public.kanban_cards 
  WHERE id = NEW.card_id;
  
  -- Gerar um thread_id Ãºnico para comentÃ¡rios de anexo
  new_thread_id := 'attachment_' || NEW.card_id || '_' || extract(epoch from now())::text || '_' || (random() * 1000000)::int::text;
  
  -- Criar conteÃºdo do comentÃ¡rio com tÃ­tulo da ficha
  comment_content := 'ðŸ“Ž Anexo adicionado: ' || NEW.file_name || E'\n' ||
                     'ðŸ“‹ Ficha: ' || COALESCE(card_title_text, 'Sem tÃ­tulo') || E'\n' ||
                     (CASE WHEN NEW.description IS NOT NULL THEN 'ðŸ“ DescriÃ§Ã£o: ' || NEW.description || E'\n' ELSE '' END) ||
                     'ðŸ“Š Detalhes do arquivo:' || E'\n' ||
                     'â€¢ Tipo: ' || NEW.file_type || E'\n' ||
                     'â€¢ Tamanho: ' || pg_size_pretty(NEW.file_size) || E'\n' ||
                     'â€¢ ExtensÃ£o: ' || NEW.file_extension || E'\n' ||
                     'â€¢ Autor: ' || NEW.author_name || ' (' || NEW.author_role || ')';

  -- Inserir comentÃ¡rio com thread_id e estrutura hierÃ¡rquica
  INSERT INTO public.card_comments (
    card_id, 
    parent_id, 
    author_id, 
    author_name, 
    author_role, 
    content, 
    level, 
    thread_id, 
    is_thread_starter,
    card_title
  )
  VALUES (
    NEW.card_id,
    NULL,
    NEW.author_id,
    NEW.author_name,
    NEW.author_role,
    comment_content,
    0,
    new_thread_id,
    true,
    card_title_text
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. ATUALIZAR FUNÃ‡ÃƒO DE COMENTÃRIO DE REMOÃ‡ÃƒO PARA INCLUIR THREAD_ID
CREATE OR REPLACE FUNCTION public.create_attachment_deletion_comment()
RETURNS TRIGGER AS $$
DECLARE
  comment_content TEXT;
  card_title_text TEXT;
  v_author_name text;
  v_author_role text;
  new_thread_id TEXT;
BEGIN
  -- Buscar tÃ­tulo do card
  SELECT title INTO card_title_text
  FROM public.kanban_cards 
  WHERE id = OLD.card_id;
  
  -- Gerar um thread_id Ãºnico para comentÃ¡rios de remoÃ§Ã£o de anexo
  new_thread_id := 'deletion_' || OLD.card_id || '_' || extract(epoch from now())::text || '_' || (random() * 1000000)::int::text;
  
  -- Criar conteÃºdo do comentÃ¡rio de remoÃ§Ã£o
  comment_content := 'ðŸ—‘ï¸ Anexo removido: ' || OLD.file_name || E'\n' ||
                     'ðŸ“‹ Ficha: ' || COALESCE(card_title_text, 'Sem tÃ­tulo');

  -- Inserir comentÃ¡rio de remoÃ§Ã£o com thread_id e estrutura hierÃ¡rquica
  INSERT INTO public.card_comments (
    card_id, 
    parent_id, 
    author_id, 
    author_name, 
    author_role, 
    content, 
    level, 
    thread_id, 
    is_thread_starter,
    card_title
  )
  VALUES (
    OLD.card_id,
    NULL,
    OLD.author_id,
    OLD.author_name,
    OLD.author_role,
    comment_content,
    0,
    new_thread_id,
    true,
    card_title_text
  );

  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- 3. COMENTÃRIO DE CONFIRMAÃ‡ÃƒO
SELECT 'FunÃ§Ãµes de comentÃ¡rio de anexo atualizadas com thread_id!' as status;
