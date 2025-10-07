-- =====================================================
-- SCRIPT COMPLETO PARA CRIAR SISTEMA DE ANEXOS
-- Execute este script no Supabase SQL Editor
-- =====================================================

-- 1. CRIAR TABELA card_comments (necessária para os triggers)
CREATE TABLE IF NOT EXISTS public.card_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id uuid NOT NULL REFERENCES public.kanban_cards(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES public.card_comments(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES public.profiles(id),
  author_name text NOT NULL,
  author_role text,
  content text NOT NULL,
  level integer NOT NULL DEFAULT 0 CHECK (level >= 0 AND level <= 2),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Índices para card_comments
CREATE INDEX IF NOT EXISTS idx_card_comments_card_id ON public.card_comments (card_id);
CREATE INDEX IF NOT EXISTS idx_card_comments_parent_id ON public.card_comments (parent_id);
CREATE INDEX IF NOT EXISTS idx_card_comments_author_id ON public.card_comments (author_id);
CREATE INDEX IF NOT EXISTS idx_card_comments_created_at ON public.card_comments (created_at);
CREATE INDEX IF NOT EXISTS idx_card_comments_level ON public.card_comments (level);

-- RLS para card_comments
ALTER TABLE public.card_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow view comments from accessible cards" ON public.card_comments
FOR SELECT USING (
  auth.uid() IS NOT NULL
);

CREATE POLICY "Allow insert comments for accessible cards" ON public.card_comments
FOR INSERT WITH CHECK (
  author_id = auth.uid() AND
  auth.uid() IS NOT NULL
);

CREATE POLICY "Allow update own comments" ON public.card_comments
FOR UPDATE USING (
  author_id = auth.uid()
) WITH CHECK (
  author_id = auth.uid()
);

CREATE POLICY "Allow delete own comments" ON public.card_comments
FOR DELETE USING (
  author_id = auth.uid()
);

-- 2. CRIAR TABELA card_attachments
CREATE TABLE IF NOT EXISTS public.card_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id uuid NOT NULL REFERENCES public.kanban_cards(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES public.profiles(id),
  author_name text NOT NULL,
  author_role text,
  file_name text NOT NULL,
  file_path text NOT NULL, -- Path in Supabase Storage
  file_size bigint NOT NULL, -- Size in bytes
  file_type text NOT NULL, -- MIME type
  file_extension text NOT NULL, -- e.g., 'pdf', 'jpg', 'png'
  description text, -- Optional description of the attachment
  comment_id uuid, -- Optional: link to specific comment/parecer
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3. CRIAR ÍNDICES PARA PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_card_attachments_card_id ON public.card_attachments (card_id);
CREATE INDEX IF NOT EXISTS idx_card_attachments_author_id ON public.card_attachments (author_id);
CREATE INDEX IF NOT EXISTS idx_card_attachments_created_at ON public.card_attachments (created_at);
CREATE INDEX IF NOT EXISTS idx_card_attachments_comment_id ON public.card_attachments (comment_id);

-- 4. CRIAR FUNÇÃO PARA ATUALIZAR updated_at
CREATE OR REPLACE FUNCTION public.set_timestamp_card_attachments()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. CRIAR TRIGGER PARA updated_at
CREATE TRIGGER set_timestamp_card_attachments
  BEFORE UPDATE ON public.card_attachments
  FOR EACH ROW
  EXECUTE FUNCTION public.set_timestamp_card_attachments();

-- 6. CRIAR BUCKET DE STORAGE
INSERT INTO storage.buckets (id, name, public)
VALUES ('card-attachments', 'card-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- 7. CRIAR RLS POLICIES PARA A TABELA
ALTER TABLE public.card_attachments ENABLE ROW LEVEL SECURITY;

-- Permitir visualizar anexos de cards acessíveis
CREATE POLICY "Allow view attachments from accessible cards" ON public.card_attachments
FOR SELECT USING (
  auth.uid() IS NOT NULL
);

-- Permitir inserir anexos para cards acessíveis
CREATE POLICY "Allow insert attachments for accessible cards" ON public.card_attachments
FOR INSERT WITH CHECK (
  author_id = auth.uid() AND
  auth.uid() IS NOT NULL
);

-- Permitir atualizar apenas próprios anexos
CREATE POLICY "Allow update own attachments" ON public.card_attachments
FOR UPDATE USING (
  author_id = auth.uid()
) WITH CHECK (
  author_id = auth.uid()
);

-- Permitir deletar apenas próprios anexos
CREATE POLICY "Allow delete own attachments" ON public.card_attachments
FOR DELETE USING (
  author_id = auth.uid()
);

-- 8. CRIAR RLS POLICIES PARA O BUCKET DE STORAGE
-- Permitir visualizar arquivos de cards acessíveis
CREATE POLICY "Allow view card attachments from accessible cards" ON storage.objects
FOR SELECT USING (
  bucket_id = 'card-attachments' AND
  auth.uid() IS NOT NULL
);

-- Permitir upload de arquivos para cards acessíveis
CREATE POLICY "Allow upload card attachments for accessible cards" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'card-attachments' AND
  auth.uid() IS NOT NULL
);

-- Permitir atualizar apenas próprios arquivos
CREATE POLICY "Allow update own card attachments" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'card-attachments' AND
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM public.card_attachments ca
    WHERE ca.file_path = name
    AND ca.author_id = auth.uid()
  )
) WITH CHECK (
  bucket_id = 'card-attachments' AND
  auth.uid() IS NOT NULL
);

-- Permitir deletar apenas próprios arquivos
CREATE POLICY "Allow delete own card attachments" ON storage.objects
FOR DELETE USING (
  bucket_id = 'card-attachments' AND
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM public.card_attachments ca
    WHERE ca.file_path = name
    AND ca.author_id = auth.uid()
  )
);

-- 9. CRIAR FUNÇÃO PARA COMENTÁRIO AUTOMÁTICO NO UPLOAD
CREATE OR REPLACE FUNCTION public.create_attachment_comment()
RETURNS TRIGGER AS $$
DECLARE
  comment_content TEXT;
BEGIN
  -- Criar conteúdo do comentário
  comment_content := format(
    '📎 Anexo adicionado: %s',
    NEW.file_name
  );
  
  -- Adicionar descrição se fornecida
  IF NEW.description IS NOT NULL AND NEW.description != '' THEN
    comment_content := comment_content || format(
      E'\n\n📝 Descrição: %s',
      NEW.description
    );
  END IF;

  -- Adicionar detalhes do arquivo
  comment_content := comment_content || format(
    E'\n\n📊 Detalhes do arquivo:' ||
    E'\n• Tipo: %s' ||
    E'\n• Tamanho: %s bytes' ||
    E'\n• Extensão: %s' ||
    E'\n• Autor: %s (%s)',
    NEW.file_type,
    NEW.file_size,
    NEW.file_extension,
    NEW.author_name,
    NEW.author_role
  );

  -- Inserir comentário na tabela card_comments
  INSERT INTO public.card_comments (
    card_id,
    author_id,
    author_name,
    author_role,
    content,
    level
  ) VALUES (
    NEW.card_id,
    NEW.author_id,
    NEW.author_name,
    NEW.author_role,
    comment_content,
    0 -- Nível de comentário principal
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 10. CRIAR TRIGGER PARA COMENTÁRIO NO UPLOAD
CREATE TRIGGER trg_create_attachment_comment
  AFTER INSERT ON public.card_attachments
  FOR EACH ROW
  EXECUTE FUNCTION public.create_attachment_comment();

-- 11. CRIAR FUNÇÃO PARA COMENTÁRIO AUTOMÁTICO NO DELETE
CREATE OR REPLACE FUNCTION public.create_attachment_deletion_comment()
RETURNS TRIGGER AS $$
DECLARE
  comment_content TEXT;
BEGIN
  -- Criar conteúdo do comentário de remoção
  comment_content := format(
    '🗑️ Anexo removido: %s',
    OLD.file_name
  );

  -- Adicionar detalhes do arquivo para referência
  comment_content := comment_content || format(
    E'\n\n📊 Detalhes do arquivo removido:' ||
    E'\n• Tipo: %s' ||
    E'\n• Tamanho: %s bytes' ||
    E'\n• Extensão: %s' ||
    E'\n• Removido por: %s (%s)',
    OLD.file_type,
    OLD.file_size,
    OLD.file_extension,
    OLD.author_name,
    OLD.author_role
  );

  -- Inserir comentário de remoção na tabela card_comments
  INSERT INTO public.card_comments (
    card_id,
    author_id,
    author_name,
    author_role,
    content,
    level
  ) VALUES (
    OLD.card_id,
    OLD.author_id,
    OLD.author_name,
    OLD.author_role,
    comment_content,
    0 -- Nível de comentário principal
  );

  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- 12. CRIAR TRIGGER PARA COMENTÁRIO NO DELETE
CREATE TRIGGER trg_create_attachment_deletion_comment
  AFTER DELETE ON public.card_attachments
  FOR EACH ROW
  EXECUTE FUNCTION public.create_attachment_deletion_comment();

-- 13. CRIAR FUNÇÕES AUXILIARES
-- Função para obter histórico de anexos
CREATE OR REPLACE FUNCTION public.get_attachment_history(card_uuid UUID)
RETURNS TABLE (
  id UUID,
  action TEXT,
  file_name TEXT,
  file_type TEXT,
  file_size BIGINT,
  description TEXT,
  author_name TEXT,
  author_role TEXT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cc.id,
    CASE 
      WHEN cc.content LIKE '📎 Anexo adicionado:%' THEN 'uploaded'
      WHEN cc.content LIKE '🗑️ Anexo removido:%' THEN 'deleted'
      ELSE 'unknown'
    END as action,
    CASE 
      WHEN cc.content LIKE '📎 Anexo adicionado:%' THEN 
        TRIM(SPLIT_PART(SPLIT_PART(cc.content, '📎 Anexo adicionado: ', 2), E'\n', 1))
      WHEN cc.content LIKE '🗑️ Anexo removido:%' THEN 
        TRIM(SPLIT_PART(SPLIT_PART(cc.content, '🗑️ Anexo removido: ', 2), E'\n', 1))
      ELSE NULL
    END as file_name,
    CASE 
      WHEN cc.content LIKE '%• Tipo: %' THEN 
        TRIM(SPLIT_PART(SPLIT_PART(cc.content, '• Tipo: ', 2), E'\n', 1))
      ELSE NULL
    END as file_type,
    CASE 
      WHEN cc.content LIKE '%• Tamanho: %' THEN 
        CAST(TRIM(SPLIT_PART(SPLIT_PART(cc.content, '• Tamanho: ', 2), ' bytes', 1)) AS BIGINT)
      ELSE NULL
    END as file_size,
    CASE 
      WHEN cc.content LIKE '%📝 Descrição: %' THEN 
        TRIM(SPLIT_PART(SPLIT_PART(cc.content, '📝 Descrição: ', 2), E'\n\n', 1))
      ELSE NULL
    END as description,
    cc.author_name,
    cc.author_role,
    cc.created_at
  FROM public.card_comments cc
  WHERE cc.card_id = card_uuid
    AND (cc.content LIKE '📎 Anexo adicionado:%' OR cc.content LIKE '🗑️ Anexo removido:%')
  ORDER BY cc.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Função para obter anexos atuais com URLs de download
CREATE OR REPLACE FUNCTION public.get_current_attachments(card_uuid UUID)
RETURNS TABLE (
  id UUID,
  file_name TEXT,
  file_type TEXT,
  file_size BIGINT,
  file_extension TEXT,
  description TEXT,
  author_name TEXT,
  author_role TEXT,
  created_at TIMESTAMPTZ,
  download_url TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ca.id,
    ca.file_name,
    ca.file_type,
    ca.file_size,
    ca.file_extension,
    ca.description,
    ca.author_name,
    ca.author_role,
    ca.created_at,
    storage.get_public_url('card-attachments', ca.file_path) as download_url
  FROM public.card_attachments ca
  WHERE ca.card_id = card_uuid
  ORDER BY ca.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- 14. CONCEDER PERMISSÕES
GRANT ALL ON public.card_attachments TO authenticated;
GRANT ALL ON public.card_comments TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_attachment_history(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_current_attachments(UUID) TO authenticated;

-- 15. CRIAR ÍNDICE PARA COMENTÁRIOS DE ANEXOS
CREATE INDEX IF NOT EXISTS idx_card_comments_attachment_actions 
ON public.card_comments (card_id, created_at) 
WHERE content LIKE '📎 Anexo adicionado:%' OR content LIKE '🗑️ Anexo removido:%';

-- =====================================================
-- SCRIPT CONCLUÍDO
-- =====================================================
-- Verifique se tudo foi criado corretamente executando:
-- SELECT 'card_attachments table created' as status;
-- SELECT 'card-attachments bucket created' as status;
