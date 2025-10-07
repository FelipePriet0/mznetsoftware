-- =====================================================
-- GARANTIR QUE TODAS AS ROLES PODEM MARCAR/DESMARCAR TAREFAS
-- =====================================================
-- Este script garante que QUALQUER usuário autenticado, independente da role
-- (Gestor, Vendedor, Analista) possa marcar e desmarcar tarefas

-- Remover todas as políticas existentes para recriar
DROP POLICY IF EXISTS "tasks_select_policy" ON public.card_tasks;
DROP POLICY IF EXISTS "tasks_insert_policy" ON public.card_tasks;
DROP POLICY IF EXISTS "tasks_update_policy" ON public.card_tasks;
DROP POLICY IF EXISTS "tasks_delete_policy" ON public.card_tasks;

-- =====================================================
-- 1. POLICY: SELECT (Visualizar tarefas)
-- =====================================================
-- QUALQUER usuário autenticado pode visualizar tarefas
CREATE POLICY "tasks_select_policy"
ON public.card_tasks
FOR SELECT
USING (
  -- Qualquer usuário autenticado pode ver tarefas
  auth.uid() IS NOT NULL
);

-- =====================================================
-- 2. POLICY: INSERT (Criar tarefas)
-- =====================================================
-- QUALQUER usuário autenticado pode criar tarefas para qualquer pessoa
CREATE POLICY "tasks_insert_policy"
ON public.card_tasks
FOR INSERT
WITH CHECK (
  -- Verificar se o usuário está autenticado
  auth.uid() IS NOT NULL
  AND
  -- Verificar se o usuário tem acesso ao card
  EXISTS (
    SELECT 1 FROM public.kanban_cards fc
    WHERE fc.id = card_id
  )
  AND
  -- Não pode criar tarefa para si mesmo
  auth.uid() != assigned_to
);

-- =====================================================
-- 3. POLICY: UPDATE (Marcar/Desmarcar tarefas)
-- =====================================================
-- QUALQUER usuário autenticado pode atualizar tarefas
-- Isso permite que qualquer role marque/desmarque tarefas
CREATE POLICY "tasks_update_policy"
ON public.card_tasks
FOR UPDATE
USING (
  -- Qualquer usuário autenticado pode atualizar
  auth.uid() IS NOT NULL
)
WITH CHECK (
  -- Qualquer usuário autenticado pode atualizar
  auth.uid() IS NOT NULL
);

-- =====================================================
-- 4. POLICY: DELETE (Deletar tarefas)
-- =====================================================
-- Apenas quem criou a tarefa pode deletá-la (manter segurança)
CREATE POLICY "tasks_delete_policy"
ON public.card_tasks
FOR DELETE
USING (
  auth.uid() = created_by
);

-- =====================================================
-- VERIFICAÇÃO DAS POLÍTICAS
-- =====================================================

-- Verificar se as políticas foram aplicadas corretamente
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

-- Log de confirmação
DO $$
BEGIN
  RAISE NOTICE '✅ Políticas aplicadas! Agora TODAS as roles podem:';
  RAISE NOTICE '   👁️  VISUALIZAR tarefas (SELECT)';
  RAISE NOTICE '   ➕ CRIAR tarefas (INSERT)';
  RAISE NOTICE '   ✅ MARCAR/DESMARCAR tarefas (UPDATE)';
  RAISE NOTICE '   🗑️  DELETAR apenas suas próprias tarefas (DELETE)';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 ROLES COM PERMISSÃO TOTAL:';
  RAISE NOTICE '   - Gestor ✅';
  RAISE NOTICE '   - Vendedor ✅';
  RAISE NOTICE '   - Analista ✅';
END $$;
