-- =====================================================
-- SCRIPT PARA INTEGRAR ANEXOS COM CONVERSAS ENCADEADAS - VERSÃƒO 2
-- Execute este script no Supabase SQL Editor
-- =====================================================

-- 1. ATUALIZAR FUNÃ‡ÃƒO PARA SEMPRE CRIAR NOVA CONVERSA NO CAMPO PRINCIPAL
CREATE OR REPLACE FUNCTION public.create_attachment_comment()
RETURNS TRIGGER AS $$
DECLARE
  comment_content TEXT;
  card_title_text TEXT;
  v_author_name TEXT;
  v_author_role TEXT;
  new_thread_id TEXT;
BEGIN
  -- Buscar tÃ­tulo do card
  SELECT title INTO card_title_text
  FROM public.kanban_cards 
  WHERE id = NEW.card_id;
  
  -- Obter informaÃ§Ãµes do autor (com fallbacks)
  v_author_name := COALESCE(NEW.author_name, 'Sistema');
  v_author_role := COALESCE(NEW.author_role, 'Sistema');
  
  -- SEMPRE criar nova conversa para anexos do campo principal
  -- (nÃ£o integrar com conversas existentes)
  new_thread_id := 'conversation_' || NEW.card_id || '_' || extract(epoch from now())::text || '_' || (random() * 1000000)::int::text;
  
  -- Criar conteÃºdo do comentÃ¡rio com tÃ­tulo da ficha
  comment_content := 'ðŸ“Ž Anexo adicionado: ' || NEW.file_name || E'\n' ||
                     'ðŸ“‹ Ficha: ' || COALESCE(card_title_text, 'Sem tÃ­tulo') || E'\n' ||
                     (CASE WHEN NEW.description IS NOT NULL AND NEW.description != '' THEN 'ðŸ“ DescriÃ§Ã£o: ' || NEW.description || E'\n' ELSE '' END) ||
                     'ðŸ“Š Detalhes do arquivo:' || E'\n' ||
                     'â€¢ Tipo: ' || COALESCE(NEW.file_type, 'Desconhecido') || E'\n' ||
                     'â€¢ Tamanho: ' || pg_size_pretty(NEW.file_size) || E'\n' ||
                     'â€¢ ExtensÃ£o: ' || COALESCE(NEW.file_extension, 'N/A') || E'\n' ||
                     'â€¢ Autor: ' || v_author_name || ' (' || v_author_role || ')';

  -- Inserir comentÃ¡rio como nova conversa
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
    NULL, -- Sempre nova conversa
    NEW.author_id,
    v_author_name,
    v_author_role,
    comment_content,
    0, -- NÃ­vel 0 (conversa principal)
    new_thread_id,
    true, -- Sempre inicia nova conversa
    card_title_text
  );

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Erro ao criar comentÃ¡rio de anexo: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. ATUALIZAR FUNÃ‡ÃƒO DE REMOÃ‡ÃƒO PARA MANTER NOVA CONVERSA
CREATE OR REPLACE FUNCTION public.create_attachment_deletion_comment()
RETURNS TRIGGER AS $$
DECLARE
  comment_content TEXT;
  card_title_text TEXT;
  v_author_name TEXT;
  v_author_role TEXT;
  new_thread_id TEXT;
BEGIN
  -- Buscar tÃ­tulo do card
  SELECT title INTO card_title_text
  FROM public.kanban_cards 
  WHERE id = OLD.card_id;
  
  -- Obter informaÃ§Ãµes do autor (com fallbacks)
  v_author_name := COALESCE(OLD.author_name, 'Sistema');
  v_author_role := COALESCE(OLD.author_role, 'Sistema');
  
  -- SEMPRE criar nova conversa para remoÃ§Ã£o de anexo
  new_thread_id := 'deletion_' || OLD.card_id || '_' || extract(epoch from now())::text || '_' || (random() * 1000000)::int::text;
  
  -- Criar conteÃºdo do comentÃ¡rio de remoÃ§Ã£o
  comment_content := 'ðŸ—‘ï¸ Anexo removido: ' || OLD.file_name || E'\n' ||
                     'ðŸ“‹ Ficha: ' || COALESCE(card_title_text, 'Sem tÃ­tulo');

  -- Inserir comentÃ¡rio de remoÃ§Ã£o como nova conversa
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
    NULL, -- Sempre nova conversa
    OLD.author_id,
    v_author_name,
    v_author_role,
    comment_content,
    0, -- NÃ­vel 0 (conversa principal)
    new_thread_id,
    true, -- Sempre inicia nova conversa
    card_title_text
  );

  RETURN OLD;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Erro ao criar comentÃ¡rio de remoÃ§Ã£o de anexo: %', SQLERRM;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- 3. COMENTÃRIO DE CONFIRMAÃ‡ÃƒO
SELECT 'Anexos do campo principal sempre criam nova conversa!' as status;
