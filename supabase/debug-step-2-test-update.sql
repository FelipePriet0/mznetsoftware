-- ============================================================
-- PASSO 2: TENTAR FAZER O UPDATE MANUALMENTE
-- ============================================================
-- Esse UPDATE vai falhar se o RLS estiver bloqueando
-- ============================================================

-- Verificar o comentÃ¡rio ANTES do update
SELECT 
  id,
  author_id,
  deleted_at,
  deleted_by
FROM card_comments
WHERE id = 'c75a143f-d0c1-4104-92be-6b636d3c0fef';

-- Tentar fazer o UPDATE
UPDATE card_comments
SET 
  deleted_at = NOW(),
  deleted_by = auth.uid()
WHERE id = 'c75a143f-d0c1-4104-92be-6b636d3c0fef';

-- Verificar o comentÃ¡rio DEPOIS do update
SELECT 
  id,
  author_id,
  deleted_at,
  deleted_by,
  CASE 
    WHEN deleted_at IS NOT NULL THEN 'âœ… UPDATE funcionou!'
    ELSE 'âŒ UPDATE falhou - RLS bloqueou'
  END as status
FROM card_comments
WHERE id = 'c75a143f-d0c1-4104-92be-6b636d3c0fef';

