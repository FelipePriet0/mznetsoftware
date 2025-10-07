-- =====================================================
-- SCRIPT PARA APRIMORAR SISTEMA DE ANEXOS
-- Execute este script no Supabase SQL Editor
-- =====================================================

-- 1. ADICIONAR COLUNA card_title NA TABELA card_comments
ALTER TABLE public.card_comments 
ADD COLUMN IF NOT EXISTS card_title text;

-- 2. ADICIONAR COLUNA card_title NA TABELA card_attachments
ALTER TABLE public.card_attachments 
ADD COLUMN IF NOT EXISTS card_title text;

-- 3. CRIAR FUNÇÃO PARA ATUALIZAR card_title EM card_comments
CREATE OR REPLACE FUNCTION public.update_card_title_in_comments()
RETURNS TRIGGER AS $$
BEGIN
  -- Buscar o título do card
  SELECT title INTO NEW.card_title
  FROM public.kanban_cards 
  WHERE id = NEW.card_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. CRIAR FUNÇÃO PARA ATUALIZAR card_title EM card_attachments
CREATE OR REPLACE FUNCTION public.update_card_title_in_attachments()
RETURNS TRIGGER AS $$
BEGIN
  -- Buscar o título do card
  SELECT title INTO NEW.card_title
  FROM public.kanban_cards 
  WHERE id = NEW.card_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. CRIAR TRIGGER PARA card_comments
CREATE TRIGGER trg_update_card_title_comments
  BEFORE INSERT ON public.card_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_card_title_in_comments();

-- 6. CRIAR TRIGGER PARA card_attachments
CREATE TRIGGER trg_update_card_title_attachments
  BEFORE INSERT ON public.card_attachments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_card_title_in_attachments();

-- 7. ATUALIZAR REGISTROS EXISTENTES (se houver)
UPDATE public.card_comments 
SET card_title = (
  SELECT title 
  FROM public.kanban_cards 
  WHERE id = card_comments.card_id
)
WHERE card_title IS NULL;

UPDATE public.card_attachments 
SET card_title = (
  SELECT title 
  FROM public.kanban_cards 
  WHERE id = card_attachments.card_id
)
WHERE card_title IS NULL;

-- 8. CRIAR ÍNDICE PARA PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_card_comments_card_title ON public.card_comments (card_title);
CREATE INDEX IF NOT EXISTS idx_card_attachments_card_title ON public.card_attachments (card_title);

-- 9. ATUALIZAR FUNÇÃO DE COMENTÁRIO AUTOMÁTICO PARA INCLUIR TÍTULO
CREATE OR REPLACE FUNCTION public.create_attachment_comment()
RETURNS TRIGGER AS $$
DECLARE
  comment_content TEXT;
  card_title_text TEXT;
BEGIN
  -- Buscar título do card
  SELECT title INTO card_title_text
  FROM public.kanban_cards 
  WHERE id = NEW.card_id;
  
  -- Criar conteúdo do comentário com título da ficha
  comment_content := '📎 Anexo adicionado: ' || NEW.file_name || E'\n' ||
                     '📋 Ficha: ' || COALESCE(card_title_text, 'Sem título') || E'\n' ||
                     (CASE WHEN NEW.description IS NOT NULL THEN '📝 Descrição: ' || NEW.description || E'\n' ELSE '' END) ||
                     '📊 Detalhes do arquivo:' || E'\n' ||
                     '• Tipo: ' || NEW.file_type || E'\n' ||
                     '• Tamanho: ' || pg_size_pretty(NEW.file_size) || E'\n' ||
                     '• Extensão: ' || NEW.file_extension || E'\n' ||
                     '• Autor: ' || NEW.author_name || ' (' || NEW.author_role || ')';

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

-- 10. ATUALIZAR FUNÇÃO DE COMENTÁRIO DE REMOÇÃO
CREATE OR REPLACE FUNCTION public.create_attachment_deletion_comment()
RETURNS TRIGGER AS $$
DECLARE
  comment_content TEXT;
  card_title_text TEXT;
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
  
  -- Criar conteúdo do comentário com título da ficha
  comment_content := '🗑️ Anexo removido: ' || OLD.file_name || E'\n' ||
                     '📋 Ficha: ' || COALESCE(card_title_text, 'Sem título') || E'\n' ||
                     '📊 Detalhes do arquivo:' || E'\n' ||
                     '• Tipo: ' || OLD.file_type || E'\n' ||
                     '• Tamanho: ' || pg_size_pretty(OLD.file_size) || E'\n' ||
                     '• Extensão: ' || OLD.file_extension || E'\n' ||
                     '• Removido por: ' || v_author_name || ' (' || v_author_role || ')';

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

-- Verificar se as colunas foram adicionadas
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name IN ('card_comments', 'card_attachments') 
AND column_name = 'card_title';

-- Verificar se os triggers foram atualizados
SELECT trigger_name, event_object_table 
FROM information_schema.triggers 
WHERE trigger_name LIKE '%card_title%';

-- Testar com dados existentes
SELECT 
  card_id,
  card_title,
  author_name,
  content
FROM public.card_comments 
WHERE content LIKE '%📎 Anexo adicionado%'
ORDER BY created_at DESC
LIMIT 5;
