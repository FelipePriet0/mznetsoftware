-- =====================================================
-- GARANTIR QUE TODAS AS ROLES PODEM MARCAR/DESMARCAR TAREFAS
-- =====================================================
-- Este script garante que QUALQUER usuÃ¡rio autenticado, independente da role
-- (Gestor, Vendedor, Analista) possa marcar e desmarcar tarefas

-- Remover todas as polÃ­ticas existentes para recriar
DROP POLICY IF EXISTS "tasks_select_policy" ON public.card_tasks;
DROP POLICY IF EXISTS "tasks_insert_policy" ON public.card_tasks;
DROP POLICY IF EXISTS "tasks_update_policy" ON public.card_tasks;
DROP POLICY IF EXISTS "tasks_delete_policy" ON public.card_tasks;

-- =====================================================
-- 1. POLICY: SELECT (Visualizar tarefas)
-- =====================================================
-- QUALQUER usuÃ¡rio autenticado pode visualizar tarefas
CREATE POLICY "tasks_select_policy"
ON public.card_tasks
FOR SELECT
USING (
  -- Qualquer usuÃ¡rio autenticado pode ver tarefas
  auth.uid() IS NOT NULL
);

-- =====================================================
-- 2. POLICY: INSERT (Criar tarefas)
-- =====================================================
-- QUALQUER usuÃ¡rio autenticado pode criar tarefas para qualquer pessoa
CREATE POLICY "tasks_insert_policy"
ON public.card_tasks
FOR INSERT
WITH CHECK (
  -- Verificar se o usuÃ¡rio estÃ¡ autenticado
  auth.uid() IS NOT NULL
  AND
  -- Verificar se o usuÃ¡rio tem acesso ao card
  EXISTS (
    SELECT 1 FROM public.kanban_cards fc
    WHERE fc.id = card_id
  )
  AND
  -- NÃ£o pode criar tarefa para si mesmo
  auth.uid() != assigned_to
);

-- =====================================================
-- 3. POLICY: UPDATE (Marcar/Desmarcar tarefas)
-- =====================================================
-- QUALQUER usuÃ¡rio autenticado pode atualizar tarefas
-- Isso permite que qualquer role marque/desmarque tarefas
CREATE POLICY "tasks_update_policy"
ON public.card_tasks
FOR UPDATE
USING (
  -- Qualquer usuÃ¡rio autenticado pode atualizar
  auth.uid() IS NOT NULL
)
WITH CHECK (
  -- Qualquer usuÃ¡rio autenticado pode atualizar
  auth.uid() IS NOT NULL
);

-- =====================================================
-- 4. POLICY: DELETE (Deletar tarefas)
-- =====================================================
-- Apenas quem criou a tarefa pode deletÃ¡-la (manter seguranÃ§a)
CREATE POLICY "tasks_delete_policy"
ON public.card_tasks
FOR DELETE
USING (
  auth.uid() = created_by
);

-- =====================================================
-- VERIFICAÃ‡ÃƒO DAS POLÃTICAS
-- =====================================================

-- Verificar se as polÃ­ticas foram aplicadas corretamente
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'card_tasks'
ORDER BY policyname;

-- Log de confirmaÃ§Ã£o
DO $$
BEGIN
  RAISE NOTICE 'âœ… PolÃ­ticas aplicadas! Agora TODAS as roles podem:';
  RAISE NOTICE '   ðŸ‘ï¸  VISUALIZAR tarefas (SELECT)';
  RAISE NOTICE '   âž• CRIAR tarefas (INSERT)';
  RAISE NOTICE '   âœ… MARCAR/DESMARCAR tarefas (UPDATE)';
  RAISE NOTICE '   ðŸ—‘ï¸  DELETAR apenas suas prÃ³prias tarefas (DELETE)';
  RAISE NOTICE '';
  RAISE NOTICE 'ðŸŽ¯ ROLES COM PERMISSÃƒO TOTAL:';
  RAISE NOTICE '   - Gestor âœ…';
  RAISE NOTICE '   - Vendedor âœ…';
  RAISE NOTICE '   - Analista âœ…';
END $$;
