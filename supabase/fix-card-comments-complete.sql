-- =====================================================
-- SCRIPT COMPLETO PARA CORRIGIR PROBLEMAS DE card_comments
-- Execute este script no Supabase SQL Editor
-- =====================================================

-- 1. VERIFICAR SE A COLUNA thread_id EXISTE, SE NÃO, CRIAR
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'card_comments' 
      AND column_name = 'thread_id'
      AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.card_comments ADD COLUMN thread_id text;
    RAISE NOTICE 'Coluna thread_id criada';
  ELSE
    RAISE NOTICE 'Coluna thread_id já existe';
  END IF;
END $$;

-- 2. VERIFICAR SE A COLUNA parent_id EXISTE, SE NÃO, CRIAR
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'card_comments' 
      AND column_name = 'parent_id'
      AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.card_comments ADD COLUMN parent_id uuid;
    RAISE NOTICE 'Coluna parent_id criada';
  ELSE
    RAISE NOTICE 'Coluna parent_id já existe';
  END IF;
END $$;

-- 3. VERIFICAR SE A COLUNA level EXISTE, SE NÃO, CRIAR
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'card_comments' 
      AND column_name = 'level'
      AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.card_comments ADD COLUMN level integer DEFAULT 0;
    RAISE NOTICE 'Coluna level criada';
  ELSE
    RAISE NOTICE 'Coluna level já existe';
  END IF;
END $$;

-- 4. VERIFICAR SE A COLUNA is_thread_starter EXISTE, SE NÃO, CRIAR
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'card_comments' 
      AND column_name = 'is_thread_starter'
      AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.card_comments ADD COLUMN is_thread_starter boolean DEFAULT true;
    RAISE NOTICE 'Coluna is_thread_starter criada';
  ELSE
    RAISE NOTICE 'Coluna is_thread_starter já existe';
  END IF;
END $$;

-- 5. VERIFICAR SE A COLUNA card_title EXISTE, SE NÃO, CRIAR
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'card_comments' 
      AND column_name = 'card_title'
      AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.card_comments ADD COLUMN card_title text;
    RAISE NOTICE 'Coluna card_title criada';
  ELSE
    RAISE NOTICE 'Coluna card_title já existe';
  END IF;
END $$;

-- 6. ATUALIZAR REGISTROS EXISTENTES QUE TÊM thread_id NULL
UPDATE public.card_comments 
SET 
  thread_id = 'legacy_' || id::text || '_' || extract(epoch from created_at)::text,
  parent_id = COALESCE(parent_id, NULL),
  level = COALESCE(level, 0),
  is_thread_starter = COALESCE(is_thread_starter, true)
WHERE thread_id IS NULL;

-- 7. DEFINIR thread_id COMO NOT NULL (remover constraint se existir e recriar)
DO $$
BEGIN
  -- Tentar remover constraint NOT NULL se existir
  BEGIN
    ALTER TABLE public.card_comments ALTER COLUMN thread_id DROP NOT NULL;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE 'Constraint NOT NULL não existia ou não pôde ser removida';
  END;
  
  -- Definir como NOT NULL
  ALTER TABLE public.card_comments ALTER COLUMN thread_id SET NOT NULL;
  RAISE NOTICE 'Coluna thread_id definida como NOT NULL';
END $$;

-- 8. RECRIAR FUNÇÕES COM VERSÃO MAIS ROBUSTA
CREATE OR REPLACE FUNCTION public.create_attachment_comment()
RETURNS TRIGGER AS $$
DECLARE
  comment_content TEXT;
  card_title_text TEXT;
  new_thread_id TEXT;
  v_author_name TEXT;
  v_author_role TEXT;
BEGIN
  -- Buscar título do card
  SELECT title INTO card_title_text
  FROM public.kanban_cards 
  WHERE id = NEW.card_id;
  
  -- Obter informações do autor (com fallbacks)
  v_author_name := COALESCE(NEW.author_name, 'Sistema');
  v_author_role := COALESCE(NEW.author_role, 'Sistema');
  
  -- Gerar um thread_id único para comentários de anexo
  new_thread_id := 'attachment_' || NEW.card_id || '_' || extract(epoch from now())::text || '_' || (random() * 1000000)::int::text;
  
  -- Criar conteúdo do comentário com título da ficha
  comment_content := '📎 Anexo adicionado: ' || NEW.file_name || E'\n' ||
                     '📋 Ficha: ' || COALESCE(card_title_text, 'Sem título') || E'\n' ||
                     (CASE WHEN NEW.description IS NOT NULL AND NEW.description != '' THEN '📝 Descrição: ' || NEW.description || E'\n' ELSE '' END) ||
                     '📊 Detalhes do arquivo:' || E'\n' ||
                     '• Tipo: ' || COALESCE(NEW.file_type, 'Desconhecido') || E'\n' ||
                     '• Tamanho: ' || pg_size_pretty(NEW.file_size) || E'\n' ||
                     '• Extensão: ' || COALESCE(NEW.file_extension, 'N/A') || E'\n' ||
                     '• Autor: ' || v_author_name || ' (' || v_author_role || ')';

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
    v_author_name,
    v_author_role,
    comment_content,
    0,
    new_thread_id,
    true,
    card_title_text
  );

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Erro ao criar comentário de anexo: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 9. RECRIAR FUNÇÃO DE REMOÇÃO
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
    v_author_name,
    v_author_role,
    comment_content,
    0,
    new_thread_id,
    true,
    card_title_text
  );

  RETURN OLD;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Erro ao criar comentário de remoção de anexo: %', SQLERRM;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- 10. RECRIAR TRIGGERS
DROP TRIGGER IF EXISTS trg_create_attachment_comment ON public.card_attachments;
CREATE TRIGGER trg_create_attachment_comment
  AFTER INSERT ON public.card_attachments
  FOR EACH ROW
  EXECUTE FUNCTION public.create_attachment_comment();

DROP TRIGGER IF EXISTS trg_create_attachment_deletion_comment ON public.card_attachments;
CREATE TRIGGER trg_create_attachment_deletion_comment
  AFTER DELETE ON public.card_attachments
  FOR EACH ROW
  EXECUTE FUNCTION public.create_attachment_deletion_comment();

-- 11. COMENTÁRIO DE CONFIRMAÇÃO
SELECT 'Estrutura da tabela card_comments corrigida e funções atualizadas!' as status;
