-- Limpeza de PolÃ­ticas Duplicadas em card_tasks
-- HÃ¡ polÃ­ticas antigas (tasks_*_policy) conflitando com as novas
-- Vamos remover TODAS e criar apenas as 4 polÃ­ticas necessÃ¡rias

-- PASSO 1: Remover TODAS as polÃ­ticas (incluindo as antigas)
DROP POLICY IF EXISTS "card_tasks_select_all" ON public.card_tasks;
DROP POLICY IF EXISTS "card_tasks_insert_authenticated" ON public.card_tasks;
DROP POLICY IF EXISTS "card_tasks_update_authenticated" ON public.card_tasks;
DROP POLICY IF EXISTS "card_tasks_delete_authenticated" ON public.card_tasks;
DROP POLICY IF EXISTS "tasks_select_policy" ON public.card_tasks;
DROP POLICY IF EXISTS "tasks_insert_policy" ON public.card_tasks;
DROP POLICY IF EXISTS "tasks_update_policy" ON public.card_tasks;
DROP POLICY IF EXISTS "tasks_delete_policy" ON public.card_tasks;

-- Remover qualquer outra polÃ­tica que possa existir
DROP POLICY IF EXISTS "Allow view tasks from accessible cards" ON public.card_tasks;
DROP POLICY IF EXISTS "Allow create tasks for authenticated users" ON public.card_tasks;
DROP POLICY IF EXISTS "Allow update own tasks" ON public.card_tasks;
DROP POLICY IF EXISTS "Allow update tasks for authenticated users" ON public.card_tasks;
DROP POLICY IF EXISTS "Allow update tasks status for all" ON public.card_tasks;
DROP POLICY IF EXISTS "Allow delete own tasks" ON public.card_tasks;
DROP POLICY IF EXISTS "Allow delete tasks for authenticated users" ON public.card_tasks;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.card_tasks;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.card_tasks;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.card_tasks;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.card_tasks;

-- Verificar se todas foram removidas
SELECT 
    'PolÃ­ticas removidas:' AS status,
    COUNT(*) AS total_restante
FROM 
    pg_policies 
WHERE 
    tablename = 'card_tasks';

-- PASSO 2: Criar APENAS 4 polÃ­ticas limpas e simples
-- SELECT: Ver tarefas nÃ£o deletadas
CREATE POLICY "card_tasks_select_all" ON public.card_tasks
FOR SELECT 
USING (deleted_at IS NULL);

-- INSERT: Qualquer usuÃ¡rio autenticado pode criar
CREATE POLICY "card_tasks_insert_all" ON public.card_tasks
FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

-- UPDATE: Qualquer usuÃ¡rio autenticado pode atualizar QUALQUER tarefa
CREATE POLICY "card_tasks_update_all" ON public.card_tasks
FOR UPDATE 
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

-- DELETE: Qualquer usuÃ¡rio autenticado pode deletar (soft delete)
CREATE POLICY "card_tasks_delete_all" ON public.card_tasks
FOR DELETE 
USING (auth.role() = 'authenticated');

-- PASSO 3: Verificar resultado final
SELECT 
    'âœ… PolÃ­ticas criadas com sucesso!' AS status,
    COUNT(*) AS total_policies
FROM 
    pg_policies 
WHERE 
    tablename = 'card_tasks';

-- Ver as 4 polÃ­ticas finais (deve mostrar exatamente 4)
SELECT 
    policyname,
    cmd,
    CASE 
        WHEN cmd = 'SELECT' THEN 'ðŸ‘ï¸ Ver tarefas nÃ£o deletadas'
        WHEN cmd = 'INSERT' THEN 'âž• Criar tarefas'
        WHEN cmd = 'UPDATE' THEN 'âœï¸ Atualizar/Marcar tarefas (SEM RESTRIÃ‡ÃƒO)'
        WHEN cmd = 'DELETE' THEN 'ðŸ—‘ï¸ Deletar tarefas'
    END as descricao,
    CASE 
        WHEN cmd = 'UPDATE' THEN 'ðŸ”“ LIBERADO PARA TODOS'
        ELSE 'âœ… OK'
    END as status_permissao
FROM 
    pg_policies 
WHERE 
    tablename = 'card_tasks'
ORDER BY 
    cmd;

-- PASSO 4: Teste direto de UPDATE
-- Vamos pegar uma tarefa pendente e tentar marcar como concluÃ­da
DO $$
DECLARE
    test_task_id UUID;
BEGIN
    -- Pegar primeira tarefa pendente
    SELECT id INTO test_task_id 
    FROM public.card_tasks 
    WHERE status = 'pending' 
      AND deleted_at IS NULL 
    LIMIT 1;
    
    IF test_task_id IS NOT NULL THEN
        -- Tentar atualizar
        UPDATE public.card_tasks
        SET 
            status = 'pending',  -- Manter como pending para nÃ£o afetar seus testes
            updated_at = NOW()
        WHERE id = test_task_id;
        
        RAISE NOTICE 'âœ… Teste de UPDATE bem-sucedido! Task ID: %', test_task_id;
    ELSE
        RAISE NOTICE 'âš ï¸ Nenhuma tarefa pendente encontrada para testar';
    END IF;
END $$;

