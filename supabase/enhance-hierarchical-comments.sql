-- =====================================================
-- SCRIPT PARA MELHORAR SISTEMA DE COMENTÁRIOS HIERÁRQUICOS
-- Conversas Correlacionadas Encadeadas
-- =====================================================

-- 1. ATUALIZAR TABELA card_comments PARA SUPORTAR MELHOR HIERARQUIA
ALTER TABLE public.card_comments 
ADD COLUMN IF NOT EXISTS level INTEGER NOT NULL DEFAULT 0 CHECK (level >= 0 AND level <= 2),
ADD COLUMN IF NOT EXISTS is_thread_starter BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS thread_id UUID,
ADD COLUMN IF NOT EXISTS reply_count INTEGER NOT NULL DEFAULT 0;

-- 2. CRIAR ÍNDICES PARA PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_card_comments_thread_id ON public.card_comments (thread_id);
CREATE INDEX IF NOT EXISTS idx_card_comments_level ON public.card_comments (level);
CREATE INDEX IF NOT EXISTS idx_card_comments_parent_level ON public.card_comments (parent_id, level);
CREATE INDEX IF NOT EXISTS idx_card_comments_thread_starter ON public.card_comments (is_thread_starter) WHERE is_thread_starter = true;

-- 3. FUNÇÃO PARA ATUALIZAR THREAD_ID E REPLY_COUNT
CREATE OR REPLACE FUNCTION public.update_comment_hierarchy()
RETURNS TRIGGER AS $$
DECLARE
  thread_uuid UUID;
  parent_thread_id UUID;
BEGIN
  -- Se é um comentário principal (sem parent_id), criar novo thread
  IF NEW.parent_id IS NULL THEN
    NEW.thread_id := gen_random_uuid();
    NEW.is_thread_starter := true;
    NEW.level := 0;
    NEW.reply_count := 0;
  ELSE
    -- Buscar informações do comentário pai
    SELECT thread_id, level + 1
    INTO parent_thread_id, NEW.level
    FROM public.card_comments
    WHERE id = NEW.parent_id;
    
    -- Usar o mesmo thread_id do pai
    NEW.thread_id := parent_thread_id;
    NEW.is_thread_starter := false;
    
    -- Limitar a 3 níveis (0, 1, 2)
    IF NEW.level > 2 THEN
      NEW.level := 2;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. FUNÇÃO PARA ATUALIZAR REPLY_COUNT DO COMENTÁRIO PAI
CREATE OR REPLACE FUNCTION public.update_parent_reply_count()
RETURNS TRIGGER AS $$
BEGIN
  -- Incrementar contador do pai quando adicionar resposta
  IF TG_OP = 'INSERT' AND NEW.parent_id IS NOT NULL THEN
    UPDATE public.card_comments 
    SET reply_count = reply_count + 1
    WHERE id = NEW.parent_id;
  END IF;
  
  -- Decrementar contador do pai quando remover resposta
  IF TG_OP = 'DELETE' AND OLD.parent_id IS NOT NULL THEN
    UPDATE public.card_comments 
    SET reply_count = reply_count - 1
    WHERE id = OLD.parent_id;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- 5. CRIAR TRIGGERS
DROP TRIGGER IF EXISTS trg_update_comment_hierarchy ON public.card_comments;
CREATE TRIGGER trg_update_comment_hierarchy
  BEFORE INSERT ON public.card_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_comment_hierarchy();

DROP TRIGGER IF EXISTS trg_update_parent_reply_count ON public.card_comments;
CREATE TRIGGER trg_update_parent_reply_count
  AFTER INSERT OR DELETE ON public.card_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_parent_reply_count();

-- 6. FUNÇÃO PARA OBTER COMENTÁRIOS HIERÁRQUICOS ORGANIZADOS
CREATE OR REPLACE FUNCTION public.get_hierarchical_comments(card_uuid UUID)
RETURNS TABLE (
  id UUID,
  card_id UUID,
  parent_id UUID,
  author_id UUID,
  author_name TEXT,
  author_role TEXT,
  content TEXT,
  level INTEGER,
  thread_id UUID,
  is_thread_starter BOOLEAN,
  reply_count INTEGER,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cc.id,
    cc.card_id,
    cc.parent_id,
    cc.author_id,
    cc.author_name,
    cc.author_role,
    cc.content,
    cc.level,
    cc.thread_id,
    cc.is_thread_starter,
    cc.reply_count,
    cc.created_at,
    cc.updated_at
  FROM public.card_comments cc
  WHERE cc.card_id = card_uuid
  ORDER BY 
    cc.thread_id,           -- Agrupar por thread
    cc.created_at,          -- Ordenar por data dentro do thread
    cc.level;               -- Nível hierárquico
END;
$$ LANGUAGE plpgsql;

-- 7. FUNÇÃO PARA OBTER ESTATÍSTICAS DE CONVERSAS
CREATE OR REPLACE FUNCTION public.get_conversation_stats(card_uuid UUID)
RETURNS TABLE (
  total_comments BIGINT,
  total_threads BIGINT,
  level_0_comments BIGINT,
  level_1_comments BIGINT,
  level_2_comments BIGINT,
  most_active_author TEXT,
  latest_activity TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) as total_comments,
    COUNT(DISTINCT thread_id) as total_threads,
    COUNT(*) FILTER (WHERE level = 0) as level_0_comments,
    COUNT(*) FILTER (WHERE level = 1) as level_1_comments,
    COUNT(*) FILTER (WHERE level = 2) as level_2_comments,
    (
      SELECT author_name 
      FROM public.card_comments cc2 
      WHERE cc2.card_id = card_uuid 
      GROUP BY author_name 
      ORDER BY COUNT(*) DESC 
      LIMIT 1
    ) as most_active_author,
    MAX(created_at) as latest_activity
  FROM public.card_comments
  WHERE card_id = card_uuid;
END;
$$ LANGUAGE plpgsql;

-- 8. ATUALIZAR COMENTÁRIOS EXISTENTES COM HIERARQUIA
UPDATE public.card_comments 
SET 
  level = 0,
  is_thread_starter = true,
  thread_id = gen_random_uuid(),
  reply_count = 0
WHERE parent_id IS NULL;

-- 9. ATUALIZAR RESPOSTAS EXISTENTES
WITH reply_updates AS (
  SELECT 
    cc.id,
    cc.parent_id,
    CASE 
      WHEN parent.parent_id IS NULL THEN 1  -- Resposta direta ao comentário principal
      ELSE 2                                -- Sub-resposta
    END as new_level,
    parent.thread_id
  FROM public.card_comments cc
  JOIN public.card_comments parent ON parent.id = cc.parent_id
  WHERE cc.parent_id IS NOT NULL
)
UPDATE public.card_comments 
SET 
  level = ru.new_level,
  is_thread_starter = false,
  thread_id = ru.thread_id
FROM reply_updates ru
WHERE public.card_comments.id = ru.id;

-- 10. ATUALIZAR CONTADORES DE RESPOSTAS
UPDATE public.card_comments 
SET reply_count = (
  SELECT COUNT(*) 
  FROM public.card_comments replies 
  WHERE replies.parent_id = public.card_comments.id
);

-- 11. CONCEDER PERMISSÕES
GRANT EXECUTE ON FUNCTION public.get_hierarchical_comments(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_conversation_stats(UUID) TO authenticated;

-- =====================================================
-- VERIFICAÇÃO
-- =====================================================
-- Para testar o sistema, execute:
-- SELECT * FROM public.get_hierarchical_comments('seu-card-id-aqui');
-- SELECT * FROM public.get_conversation_stats('seu-card-id-aqui');

-- =====================================================
-- SCRIPT CONCLUÍDO
-- =====================================================
