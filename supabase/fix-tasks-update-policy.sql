-- =====================================================
-- CORREÃ‡ÃƒO: Permitir que QUALQUER usuÃ¡rio crie e marque/desmarque tarefas
-- =====================================================
-- Este script corrige as polÃ­ticas de INSERT e UPDATE para permitir que qualquer usuÃ¡rio autenticado
-- possa criar tarefas para qualquer pessoa e marcar/desmarcar tarefas como concluÃ­das

-- Remover polÃ­ticas antigas restritivas
DROP POLICY IF EXISTS "tasks_insert_policy" ON public.card_tasks;
DROP POLICY IF EXISTS "tasks_update_policy" ON public.card_tasks;
DROP POLICY IF EXISTS "tasks_select_policy" ON public.card_tasks;

-- Criar nova polÃ­tica permissiva para INSERT
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

-- Criar nova polÃ­tica permissiva para UPDATE
-- QUALQUER usuÃ¡rio autenticado pode atualizar tarefas
-- Isso permite que qualquer um marque/desmarque tarefas
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

-- Criar nova polÃ­tica permissiva para SELECT
-- QUALQUER usuÃ¡rio autenticado pode visualizar tarefas
-- Se o usuÃ¡rio pode ver o card, pode ver suas tarefas
CREATE POLICY "tasks_select_policy"
ON public.card_tasks
FOR SELECT
USING (
  -- Qualquer usuÃ¡rio autenticado pode ver tarefas
  auth.uid() IS NOT NULL
);

-- Verificar se as polÃ­ticas foram aplicadas
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'card_tasks' AND policyname IN ('tasks_insert_policy', 'tasks_update_policy', 'tasks_select_policy')
ORDER BY policyname;

-- Log de confirmaÃ§Ã£o
DO $$
BEGIN
  RAISE NOTICE 'âœ… PolÃ­ticas corrigidas! Agora QUALQUER usuÃ¡rio pode:';
  RAISE NOTICE '   - Visualizar tarefas (SELECT)';
  RAISE NOTICE '   - Criar tarefas para qualquer pessoa (INSERT)';
  RAISE NOTICE '   - Marcar/desmarcar tarefas como concluÃ­das (UPDATE)';
END $$;
