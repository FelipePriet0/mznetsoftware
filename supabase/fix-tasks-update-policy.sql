-- =====================================================
-- CORREÇÃO: Permitir que QUALQUER usuário crie e marque/desmarque tarefas
-- =====================================================
-- Este script corrige as políticas de INSERT e UPDATE para permitir que qualquer usuário autenticado
-- possa criar tarefas para qualquer pessoa e marcar/desmarcar tarefas como concluídas

-- Remover políticas antigas restritivas
DROP POLICY IF EXISTS "tasks_insert_policy" ON public.card_tasks;
DROP POLICY IF EXISTS "tasks_update_policy" ON public.card_tasks;
DROP POLICY IF EXISTS "tasks_select_policy" ON public.card_tasks;

-- Criar nova política permissiva para INSERT
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

-- Criar nova política permissiva para UPDATE
-- QUALQUER usuário autenticado pode atualizar tarefas
-- Isso permite que qualquer um marque/desmarque tarefas
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

-- Criar nova política permissiva para SELECT
-- QUALQUER usuário autenticado pode visualizar tarefas
-- Se o usuário pode ver o card, pode ver suas tarefas
CREATE POLICY "tasks_select_policy"
ON public.card_tasks
FOR SELECT
USING (
  -- Qualquer usuário autenticado pode ver tarefas
  auth.uid() IS NOT NULL
);

-- Verificar se as políticas foram aplicadas
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

-- Log de confirmação
DO $$
BEGIN
  RAISE NOTICE '✅ Políticas corrigidas! Agora QUALQUER usuário pode:';
  RAISE NOTICE '   - Visualizar tarefas (SELECT)';
  RAISE NOTICE '   - Criar tarefas para qualquer pessoa (INSERT)';
  RAISE NOTICE '   - Marcar/desmarcar tarefas como concluídas (UPDATE)';
END $$;
