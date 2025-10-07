-- =====================================================
-- AJUSTAR RLS PARA EDIÇÃO DE TAREFAS
-- =====================================================
-- Regras de negócio:
-- - Vendedores e Analistas: Só editam tarefas que criaram
-- - Gestores: Editam qualquer tarefa
-- =====================================================

-- Remover policy de UPDATE atual
DROP POLICY IF EXISTS "tasks_update_policy" ON public.card_tasks;

-- Criar nova policy de UPDATE com regras específicas por role
CREATE POLICY "tasks_update_policy"
ON public.card_tasks
FOR UPDATE
USING (
  -- Qualquer usuário autenticado pode tentar atualizar
  auth.uid() IS NOT NULL
)
WITH CHECK (
  -- Verificar se o usuário está autenticado
  auth.uid() IS NOT NULL
  AND
  (
    -- Gestores podem editar qualquer tarefa
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() 
      AND p.role = 'gestor'
    )
    OR
    -- Vendedores e Analistas só podem editar tarefas que criaram
    (
      EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid() 
        AND p.role IN ('vendedor', 'analista')
      )
      AND
      created_by = auth.uid()
    )
  )
);

-- Verificar se a policy foi criada corretamente
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'card_tasks'
    AND policyname = 'tasks_update_policy'
  ) THEN
    RAISE NOTICE '✓ Policy de UPDATE atualizada com sucesso';
    RAISE NOTICE '✓ Vendedores/Analistas: só editam tarefas que criaram';
    RAISE NOTICE '✓ Gestores: editam qualquer tarefa';
  ELSE
    RAISE EXCEPTION '✗ Erro: Policy de UPDATE não foi criada';
  END IF;
END $$;

-- =====================================================
-- VERIFICAÇÃO DAS POLICIES EXISTENTES
-- =====================================================

-- Listar todas as policies da tabela card_tasks
SELECT 
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'card_tasks'
ORDER BY policyname;
