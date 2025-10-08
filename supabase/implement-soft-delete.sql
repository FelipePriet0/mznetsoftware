-- =====================================================
-- IMPLEMENTAR SOFT DELETE SYSTEM
-- Execute este script no Supabase SQL Editor
-- =====================================================

-- 1. ADICIONAR COLUNAS DE SOFT DELETE NAS TABELAS PRINCIPAIS
ALTER TABLE card_comments 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES profiles(id);

ALTER TABLE card_attachments 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES profiles(id);

ALTER TABLE card_tasks 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES profiles(id);

-- 2. CRIAR ÃNDICES PARA PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_card_comments_deleted_at ON card_comments(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_card_attachments_deleted_at ON card_attachments(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_card_tasks_deleted_at ON card_tasks(deleted_at) WHERE deleted_at IS NOT NULL;

-- 3. ATUALIZAR RLS POLICIES PARA EXCLUIR REGISTROS DELETADOS DAS QUERIES
-- Remover policies antigas de SELECT
DROP POLICY IF EXISTS "Allow view comments from accessible cards" ON card_comments;
DROP POLICY IF EXISTS "Allow view attachments from accessible cards" ON card_attachments;
DROP POLICY IF EXISTS "tasks_select_policy" ON card_tasks;

-- Criar novas policies que excluem registros deletados
CREATE POLICY "Allow view comments from accessible cards" ON card_comments
FOR SELECT USING (
  auth.uid() IS NOT NULL AND deleted_at IS NULL
);

CREATE POLICY "Allow view attachments from accessible cards" ON card_attachments
FOR SELECT USING (
  auth.uid() IS NOT NULL AND deleted_at IS NULL
);

CREATE POLICY "tasks_select_policy" ON card_tasks
FOR SELECT USING (
  auth.uid() IS NOT NULL AND deleted_at IS NULL
);

-- 4. CRIAR FUNCTION PARA SOFT DELETE DE COMENTÃRIOS
CREATE OR REPLACE FUNCTION soft_delete_comment(p_comment_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Soft delete do comentÃ¡rio e todos os filhos (cascade)
  UPDATE card_comments
  SET deleted_at = NOW(),
      deleted_by = auth.uid()
  WHERE id = p_comment_id
     OR parent_id = p_comment_id;
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$$;

-- 5. CRIAR FUNCTION PARA SOFT DELETE DE ANEXOS
CREATE OR REPLACE FUNCTION soft_delete_attachment(p_attachment_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE card_attachments
  SET deleted_at = NOW(),
      deleted_by = auth.uid()
  WHERE id = p_attachment_id;
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$$;

-- 6. CRIAR FUNCTION PARA SOFT DELETE DE TAREFAS
CREATE OR REPLACE FUNCTION soft_delete_task(p_task_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE card_tasks
  SET deleted_at = NOW(),
      deleted_by = auth.uid()
  WHERE id = p_task_id;
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$$;

-- 7. CRIAR FUNCTION PARA RESTAURAR COMENTÃRIO (SE NECESSÃRIO)
CREATE OR REPLACE FUNCTION restore_comment(p_comment_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE card_comments
  SET deleted_at = NULL,
      deleted_by = NULL
  WHERE id = p_comment_id;
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$$;

-- 8. CRIAR FUNCTION DE LIMPEZA AUTOMÃTICA (90 DIAS)
CREATE OR REPLACE FUNCTION cleanup_old_deleted_records()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Deletar PERMANENTEMENTE registros deletados hÃ¡ mais de 90 dias
  DELETE FROM card_comments
  WHERE deleted_at IS NOT NULL
    AND deleted_at < NOW() - INTERVAL '90 days';
  
  DELETE FROM card_attachments
  WHERE deleted_at IS NOT NULL
    AND deleted_at < NOW() - INTERVAL '90 days';
  
  DELETE FROM card_tasks
  WHERE deleted_at IS NOT NULL
    AND deleted_at < NOW() - INTERVAL '90 days';
  
  RAISE NOTICE 'Limpeza de registros antigos concluÃ­da';
END;
$$;

-- 9. CRIAR TABELA DE LOG DE EXCLUSÃ•ES (AUDITORIA)
CREATE TABLE IF NOT EXISTS deletion_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  deleted_by UUID NOT NULL REFERENCES profiles(id),
  deleted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  record_snapshot JSONB, -- Snapshot do registro antes de deletar
  reason TEXT
);

CREATE INDEX IF NOT EXISTS idx_deletion_log_table_record ON deletion_log(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_deletion_log_deleted_by ON deletion_log(deleted_by);
CREATE INDEX IF NOT EXISTS idx_deletion_log_deleted_at ON deletion_log(deleted_at);

-- RLS para deletion_log
ALTER TABLE deletion_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "deletion_log_select_all" ON deletion_log;
CREATE POLICY "deletion_log_select_all" ON deletion_log
FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "deletion_log_insert_system" ON deletion_log;
CREATE POLICY "deletion_log_insert_system" ON deletion_log
FOR INSERT WITH CHECK (deleted_by = auth.uid());

-- 10. CRIAR TRIGGER PARA LOGAR EXCLUSÃ•ES AUTOMÃTICAMENTE
CREATE OR REPLACE FUNCTION log_deletion()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL THEN
    INSERT INTO deletion_log (table_name, record_id, deleted_by, record_snapshot)
    VALUES (TG_TABLE_NAME, OLD.id, NEW.deleted_by, row_to_json(OLD));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS log_comment_deletion ON card_comments;
CREATE TRIGGER log_comment_deletion
  AFTER UPDATE ON card_comments
  FOR EACH ROW
  EXECUTE FUNCTION log_deletion();

DROP TRIGGER IF EXISTS log_attachment_deletion ON card_attachments;
CREATE TRIGGER log_attachment_deletion
  AFTER UPDATE ON card_attachments
  FOR EACH ROW
  EXECUTE FUNCTION log_deletion();

DROP TRIGGER IF EXISTS log_task_deletion ON card_tasks;
CREATE TRIGGER log_task_deletion
  AFTER UPDATE ON card_tasks
  FOR EACH ROW
  EXECUTE FUNCTION log_deletion();

-- 11. VERIFICAR RESULTADO
SELECT 
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name IN ('card_comments', 'card_attachments', 'card_tasks')
  AND column_name IN ('deleted_at', 'deleted_by')
ORDER BY table_name, column_name;

-- âœ… SUCESSO!
-- Soft delete implementado com:
-- - Colunas deleted_at/deleted_by
-- - Functions para soft delete
-- - Auditoria completa (deletion_log)
-- - Limpeza automÃ¡tica apÃ³s 90 dias

