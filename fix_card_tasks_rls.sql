-- REMOVER TODAS AS RLS DA TABELA card_tasks
-- Igual fizemos com card_comments e card_attachments - deixar tudo liberado
-- 
-- Run this script in Supabase SQL Editor
-- IMPORTANTE: Execute todo este script de uma vez!

-- PASSO 1: Remover TODAS as polÃ­ticas RLS existentes
DROP POLICY IF EXISTS "card_tasks_select_all" ON public.card_tasks;
DROP POLICY IF EXISTS "card_tasks_insert_authenticated" ON public.card_tasks;
DROP POLICY IF EXISTS "card_tasks_update_authenticated" ON public.card_tasks;
DROP POLICY IF EXISTS "card_tasks_delete_authenticated" ON public.card_tasks;
DROP POLICY IF EXISTS "Allow view tasks from accessible cards" ON public.card_tasks;
DROP POLICY IF EXISTS "Allow create tasks for authenticated users" ON public.card_tasks;
DROP POLICY IF EXISTS "Allow update own tasks" ON public.card_tasks;
DROP POLICY IF EXISTS "Allow update tasks for authenticated users" ON public.card_tasks;
DROP POLICY IF EXISTS "Allow update tasks status for all" ON public.card_tasks;
DROP POLICY IF EXISTS "Allow delete own tasks" ON public.card_tasks;
DROP POLICY IF EXISTS "Allow delete tasks for authenticated users" ON public.card_tasks;
DROP POLICY IF EXISTS "Tasks select policy" ON public.card_tasks;
DROP POLICY IF EXISTS "Tasks insert policy" ON public.card_tasks;
DROP POLICY IF EXISTS "Tasks update policy" ON public.card_tasks;
DROP POLICY IF EXISTS "Tasks delete policy" ON public.card_tasks;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.card_tasks;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.card_tasks;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.card_tasks;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.card_tasks;

-- PASSO 2: Criar polÃ­ticas SUPER PERMISSIVAS (igual card_comments e card_attachments)
-- SELECT: Todos podem ver (apenas tarefas nÃ£o deletadas)
CREATE POLICY "card_tasks_select_all" ON public.card_tasks
FOR SELECT 
USING (deleted_at IS NULL);

-- INSERT: UsuÃ¡rios autenticados podem inserir
CREATE POLICY "card_tasks_insert_authenticated" ON public.card_tasks
FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

-- UPDATE: UsuÃ¡rios autenticados podem atualizar QUALQUER tarefa
-- ISSO INCLUI MARCAR COMO CONCLUÃDA!
CREATE POLICY "card_tasks_update_authenticated" ON public.card_tasks
FOR UPDATE 
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

-- DELETE: UsuÃ¡rios autenticados podem deletar QUALQUER tarefa (soft delete)
CREATE POLICY "card_tasks_delete_authenticated" ON public.card_tasks
FOR DELETE 
USING (auth.role() = 'authenticated');

-- Verificar resultado
SELECT 
    'PolÃ­ticas RLS criadas com sucesso!' AS status,
    COUNT(*) AS total_policies
FROM 
    pg_policies 
WHERE 
    tablename = 'card_tasks';

-- Ver as polÃ­ticas criadas
SELECT 
    policyname,
    cmd,
    CASE 
        WHEN cmd = 'SELECT' THEN 'Ver tarefas'
        WHEN cmd = 'INSERT' THEN 'Criar tarefas'
        WHEN cmd = 'UPDATE' THEN 'Atualizar tarefas (incluindo marcar concluÃ­da)'
        WHEN cmd = 'DELETE' THEN 'Deletar tarefas'
    END as descricao
FROM 
    pg_policies 
WHERE 
    tablename = 'card_tasks'
ORDER BY 
    cmd;

