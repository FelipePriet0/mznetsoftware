-- =====================================================
-- SCRIPT PARA CORRIGIR THREAD_ID EM COMENTÁRIOS DE ANEXO
-- Execute este script no Supabase SQL Editor
-- =====================================================

-- 1. ATUALIZAR FUNÇÃO DE COMENTÁRIO AUTOMÁTICO PARA INCLUIR THREAD_ID
CREATE OR REPLACE FUNCTION public.create_attachment_comment()
RETURNS TRIGGER AS $$
DECLARE
  comment_content TEXT;
  card_title_text TEXT;
  new_thread_id TEXT;
BEGIN
  -- Buscar título do card
  SELECT title INTO card_title_text
  FROM public.kanban_cards 
  WHERE id = NEW.card_id;
  
  -- Gerar um thread_id único para comentários de anexo
  new_thread_id := 'attachment_' || NEW.card_id || '_' || extract(epoch from now())::text || '_' || (random() * 1000000)::int::text;
  
  -- Criar conteúdo do comentário com título da ficha
  comment_content := '📎 Anexo adicionado: ' || NEW.file_name || E'\n' ||
                     '📋 Ficha: ' || COALESCE(card_title_text, 'Sem título') || E'\n' ||
                     (CASE WHEN NEW.description IS NOT NULL THEN '📝 Descrição: ' || NEW.description || E'\n' ELSE '' END) ||
                     '📊 Detalhes do arquivo:' || E'\n' ||
                     '• Tipo: ' || NEW.file_type || E'\n' ||
                     '• Tamanho: ' || pg_size_pretty(NEW.file_size) || E'\n' ||
                     '• Extensão: ' || NEW.file_extension || E'\n' ||
                     '• Autor: ' || NEW.author_name || ' (' || NEW.author_role || ')';

  -- Inserir comentário com thread_id e estrutura hierárquica
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

-- 2. ATUALIZAR FUNÇÃO DE COMENTÁRIO DE REMOÇÃO PARA INCLUIR THREAD_ID
CREATE OR REPLACE FUNCTION public.create_attachment_deletion_comment()
RETURNS TRIGGER AS $$
DECLARE
  comment_content TEXT;
  card_title_text TEXT;
  v_author_name text;
  v_author_role text;
  new_thread_id TEXT;
BEGIN
  -- Buscar título do card
  SELECT title INTO card_title_text
  FROM public.kanban_cards 
  WHERE id = OLD.card_id;
  
  -- Gerar um thread_id único para comentários de remoção de anexo
  new_thread_id := 'deletion_' || OLD.card_id || '_' || extract(epoch from now())::text || '_' || (random() * 1000000)::int::text;
  
  -- Criar conteúdo do comentário de remoção
  comment_content := '🗑️ Anexo removido: ' || OLD.file_name || E'\n' ||
                     '📋 Ficha: ' || COALESCE(card_title_text, 'Sem título');

  -- Inserir comentário de remoção com thread_id e estrutura hierárquica
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

-- 3. COMENTÁRIO DE CONFIRMAÇÃO
SELECT 'Funções de comentário de anexo atualizadas com thread_id!' as status;
