-- =====================================================
-- SCRIPT PARA INTEGRAR ANEXOS COM CONVERSAS ENCADEADAS - VERSÃO 2
-- Execute este script no Supabase SQL Editor
-- =====================================================

-- 1. ATUALIZAR FUNÇÃO PARA SEMPRE CRIAR NOVA CONVERSA NO CAMPO PRINCIPAL
CREATE OR REPLACE FUNCTION public.create_attachment_comment()
RETURNS TRIGGER AS $$
DECLARE
  comment_content TEXT;
  card_title_text TEXT;
  v_author_name TEXT;
  v_author_role TEXT;
  new_thread_id TEXT;
BEGIN
  -- Buscar título do card
  SELECT title INTO card_title_text
  FROM public.kanban_cards 
  WHERE id = NEW.card_id;
  
  -- Obter informações do autor (com fallbacks)
  v_author_name := COALESCE(NEW.author_name, 'Sistema');
  v_author_role := COALESCE(NEW.author_role, 'Sistema');
  
  -- SEMPRE criar nova conversa para anexos do campo principal
  -- (não integrar com conversas existentes)
  new_thread_id := 'conversation_' || NEW.card_id || '_' || extract(epoch from now())::text || '_' || (random() * 1000000)::int::text;
  
  -- Criar conteúdo do comentário com título da ficha
  comment_content := '📎 Anexo adicionado: ' || NEW.file_name || E'\n' ||
                     '📋 Ficha: ' || COALESCE(card_title_text, 'Sem título') || E'\n' ||
                     (CASE WHEN NEW.description IS NOT NULL AND NEW.description != '' THEN '📝 Descrição: ' || NEW.description || E'\n' ELSE '' END) ||
                     '📊 Detalhes do arquivo:' || E'\n' ||
                     '• Tipo: ' || COALESCE(NEW.file_type, 'Desconhecido') || E'\n' ||
                     '• Tamanho: ' || pg_size_pretty(NEW.file_size) || E'\n' ||
                     '• Extensão: ' || COALESCE(NEW.file_extension, 'N/A') || E'\n' ||
                     '• Autor: ' || v_author_name || ' (' || v_author_role || ')';

  -- Inserir comentário como nova conversa
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
    0, -- Nível 0 (conversa principal)
    new_thread_id,
    true, -- Sempre inicia nova conversa
    card_title_text
  );

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Erro ao criar comentário de anexo: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. ATUALIZAR FUNÇÃO DE REMOÇÃO PARA MANTER NOVA CONVERSA
CREATE OR REPLACE FUNCTION public.create_attachment_deletion_comment()
RETURNS TRIGGER AS $$
DECLARE
  comment_content TEXT;
  card_title_text TEXT;
  v_author_name TEXT;
  v_author_role TEXT;
  new_thread_id TEXT;
BEGIN
  -- Buscar título do card
  SELECT title INTO card_title_text
  FROM public.kanban_cards 
  WHERE id = OLD.card_id;
  
  -- Obter informações do autor (com fallbacks)
  v_author_name := COALESCE(OLD.author_name, 'Sistema');
  v_author_role := COALESCE(OLD.author_role, 'Sistema');
  
  -- SEMPRE criar nova conversa para remoção de anexo
  new_thread_id := 'deletion_' || OLD.card_id || '_' || extract(epoch from now())::text || '_' || (random() * 1000000)::int::text;
  
  -- Criar conteúdo do comentário de remoção
  comment_content := '🗑️ Anexo removido: ' || OLD.file_name || E'\n' ||
                     '📋 Ficha: ' || COALESCE(card_title_text, 'Sem título');

  -- Inserir comentário de remoção como nova conversa
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
    0, -- Nível 0 (conversa principal)
    new_thread_id,
    true, -- Sempre inicia nova conversa
    card_title_text
  );

  RETURN OLD;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Erro ao criar comentário de remoção de anexo: %', SQLERRM;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- 3. COMENTÁRIO DE CONFIRMAÇÃO
SELECT 'Anexos do campo principal sempre criam nova conversa!' as status;
