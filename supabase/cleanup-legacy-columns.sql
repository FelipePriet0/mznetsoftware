-- =====================================================
-- LIMPEZA DE COLUNAS LEGADO E NÃƒO USADAS
-- Execute este script no Supabase SQL Editor
-- =====================================================

-- 1. REMOVER VIEWS que dependem de card_title
DROP VIEW IF EXISTS storage_organization_status CASCADE;
DROP VIEW IF EXISTS v_card_tasks_detailed CASCADE;

-- 2. REMOVER TRIGGERS que preenchem card_title
DROP TRIGGER IF EXISTS trg_update_card_title_attachments ON card_attachments;
DROP TRIGGER IF EXISTS trg_update_card_title_comments ON card_comments;
DROP TRIGGER IF EXISTS set_task_card_title_trigger ON card_tasks;

-- 3. REMOVER FUNCTIONS relacionadas a card_title
DROP FUNCTION IF EXISTS update_card_title_in_attachments();
DROP FUNCTION IF EXISTS update_card_title_in_comments();
DROP FUNCTION IF EXISTS set_task_card_title();

-- 4. REMOVER COLUNAS card_title (denormalizadas)
ALTER TABLE card_attachments DROP COLUMN IF EXISTS card_title;
ALTER TABLE card_comments DROP COLUMN IF EXISTS card_title;
ALTER TABLE card_tasks DROP COLUMN IF EXISTS card_title;

-- 5. REMOVER COLUNAS legado de kanban_cards
ALTER TABLE kanban_cards DROP COLUMN IF EXISTS comments;
ALTER TABLE kanban_cards DROP COLUMN IF EXISTS comments_short;

-- 6. REMOVER COLUNAS nÃ£o usadas de kanban_cards
ALTER TABLE kanban_cards DROP COLUMN IF EXISTS labels;
ALTER TABLE kanban_cards DROP COLUMN IF EXISTS priority;

-- 7. VERIFICAR RESULTADO
SELECT 
  table_name,
  column_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('kanban_cards', 'card_attachments', 'card_comments', 'card_tasks')
ORDER BY table_name, ordinal_position;

-- âœ… SUCESSO!
-- Agora seu banco estÃ¡ limpo e organizado

