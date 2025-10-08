-- =====================================================
-- SCRIPT PARA INTEGRAR ANEXOS COM CONVERSAS ENCADEADAS
-- Execute este script no Supabase SQL Editor
-- =====================================================

-- 1. ATUALIZAR FUNÃ‡ÃƒO PARA USAR THREAD_ID DA CONVERSA ATIVA
CREATE OR REPLACE FUNCTION public.create_attachment_comment()
RETURNS TRIGGER AS $$
DECLARE
  comment_content TEXT;
  card_title_text TEXT;
  v_author_name TEXT;
  v_author_role TEXT;
  active_thread_id TEXT;
  thread_level INTEGER;
  thread_parent_id UUID;
BEGIN
  -- Buscar tÃ­tulo do card
  SELECT title INTO card_title_text
  FROM public.kanban_cards 
  WHERE id = NEW.card_id;
  
  -- Obter informaÃ§Ãµes do autor (com fallbacks)
  v_author_name := COALESCE(NEW.author_name, 'Sistema');
  v_author_role := COALESCE(NEW.author_role, 'Sistema');
  
  -- Buscar a conversa ativa mais recente para este card
  -- (Ãºltima conversa criada pelo mesmo autor nos Ãºltimos 5 minutos)
  SELECT 
    thread_id,
    level,
    parent_id
  INTO 
    active_thread_id,
    thread_level,
    thread_parent_id
  FROM public.card_comments 
  WHERE card_id = NEW.card_id 
    AND author_id = NEW.author_id
    AND created_at > (NOW() - INTERVAL '5 minutes')
    AND is_thread_starter = true
  ORDER BY created_at DESC 
  LIMIT 1;
  
  -- Se nÃ£o hÃ¡ conversa ativa, criar nova
  IF active_thread_id IS NULL THEN
    active_thread_id := 'conversation_' || NEW.card_id || '_' || extract(epoch from now())::text || '_' || (random() * 1000000)::int::text;
    thread_level := 0;
    thread_parent_id := NULL;
  ELSE
    -- Se hÃ¡ conversa ativa, usar o nÃ­vel da conversa
    thread_level := thread_level;
    thread_parent_id := thread_parent_id;
  END IF;
  
  -- Criar conteÃºdo do comentÃ¡rio com tÃ­tulo da ficha
  comment_content := 'ðŸ“Ž Anexo adicionado: ' || NEW.file_name || E'\n' ||
                     'ðŸ“‹ Ficha: ' || COALESCE(card_title_text, 'Sem tÃ­tulo') || E'\n' ||
                     (CASE WHEN NEW.description IS NOT NULL AND NEW.description != '' THEN 'ðŸ“ DescriÃ§Ã£o: ' || NEW.description || E'\n' ELSE '' END) ||
                     'ðŸ“Š Detalhes do arquivo:' || E'\n' ||
                     'â€¢ Tipo: ' || COALESCE(NEW.file_type, 'Desconhecido') || E'\n' ||
                     'â€¢ Tamanho: ' || pg_size_pretty(NEW.file_size) || E'\n' ||
                     'â€¢ ExtensÃ£o: ' || COALESCE(NEW.file_extension, 'N/A') || E'\n' ||
                     'â€¢ Autor: ' || v_author_name || ' (' || v_author_role || ')';

  -- Inserir comentÃ¡rio na mesma conversa
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
    thread_parent_id,
    NEW.author_id,
    v_author_name,
    v_author_role,
    comment_content,
    thread_level,
    active_thread_id,
    false, -- Anexo nÃ£o inicia nova conversa, apenas adiciona Ã  existente
    card_title_text
  );

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Erro ao criar comentÃ¡rio de anexo: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. ATUALIZAR FUNÃ‡ÃƒO DE REMOÃ‡ÃƒO PARA MANTER CONTEXTO DA CONVERSA
CREATE OR REPLACE FUNCTION public.create_attachment_deletion_comment()
RETURNS TRIGGER AS $$
DECLARE
  comment_content TEXT;
  card_title_text TEXT;
  v_author_name TEXT;
  v_author_role TEXT;
  active_thread_id TEXT;
  thread_level INTEGER;
  thread_parent_id UUID;
BEGIN
  -- Buscar tÃ­tulo do card
  SELECT title INTO card_title_text
  FROM public.kanban_cards 
  WHERE id = OLD.card_id;
  
  -- Obter informaÃ§Ãµes do autor (com fallbacks)
  v_author_name := COALESCE(OLD.author_name, 'Sistema');
  v_author_role := COALESCE(OLD.author_role, 'Sistema');
  
  -- Buscar a conversa ativa mais recente para este card
  SELECT 
    thread_id,
    level,
    parent_id
  INTO 
    active_thread_id,
    thread_level,
    thread_parent_id
  FROM public.card_comments 
  WHERE card_id = OLD.card_id 
    AND author_id = OLD.author_id
    AND created_at > (NOW() - INTERVAL '5 minutes')
    AND is_thread_starter = true
  ORDER BY created_at DESC 
  LIMIT 1;
  
  -- Se nÃ£o hÃ¡ conversa ativa, criar nova
  IF active_thread_id IS NULL THEN
    active_thread_id := 'conversation_' || OLD.card_id || '_' || extract(epoch from now())::text || '_' || (random() * 1000000)::int::text;
    thread_level := 0;
    thread_parent_id := NULL;
  ELSE
    -- Se hÃ¡ conversa ativa, usar o nÃ­vel da conversa
    thread_level := thread_level;
    thread_parent_id := thread_parent_id;
  END IF;
  
  -- Criar conteÃºdo do comentÃ¡rio de remoÃ§Ã£o
  comment_content := 'ðŸ—‘ï¸ Anexo removido: ' || OLD.file_name || E'\n' ||
                     'ðŸ“‹ Ficha: ' || COALESCE(card_title_text, 'Sem tÃ­tulo');

  -- Inserir comentÃ¡rio de remoÃ§Ã£o na mesma conversa
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
    thread_parent_id,
    OLD.author_id,
    v_author_name,
    v_author_role,
    comment_content,
    thread_level,
    active_thread_id,
    false, -- RemoÃ§Ã£o nÃ£o inicia nova conversa
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
SELECT 'Anexos agora integram com conversas encadeadas!' as status;
