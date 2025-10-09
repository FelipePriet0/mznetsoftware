    '-- Teste de AtualizaÃ§Ã£o de Status de Tarefas
    -- Use este script para testar se consegue atualizar o status de uma tarefa

    -- 1. Ver todas as tarefas ativas
    SELECT 
        id,
        description,
        status,
        comment_id,
        assigned_to,
        created_at
    FROM 
        public.card_tasks
    WHERE 
        deleted_at IS NULL
    ORDER BY 
        created_at DESC
    LIMIT 10;

    -- 2. EstatÃ­sticas de tarefas por status
    SELECT 
        status,
        COUNT(*) as quantidade,
        ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM public.card_tasks WHERE deleted_at IS NULL), 2) as porcentagem
    FROM 
        public.card_tasks
    WHERE 
        deleted_at IS NULL
    GROUP BY 
        status;

    -- 3. Teste manual de UPDATE (substitua o ID)
    -- Descomente e substitua 'YOUR_TASK_ID_HERE' pelo ID de uma tarefa que vocÃª quer testar
    /*
    UPDATE public.card_tasks
    SET 
        status = 'completed',
        completed_at = NOW(),
        updated_at = NOW()
    WHERE 
        id = 'YOUR_TASK_ID_HERE'
    RETURNING *;
    */

    -- 4. Verificar se a tarefa foi atualizada
    -- Descomente e substitua 'YOUR_TASK_ID_HERE'
    /*
    SELECT 
        id,
        description,
        status,
        completed_at,
        updated_at
    FROM 
        public.card_tasks
    WHERE 
        id = 'YOUR_TASK_ID_HERE';
    */

    -- 5. Ver tarefas que NÃƒO tem comment_id (podem causar problema)
    SELECT 
        id,
        description,
        status,
        comment_id,
        card_id,
        'Tarefa sem comment_id - pode nÃ£o aparecer na thread' as alerta
    FROM 
        public.card_tasks
    WHERE 
        comment_id IS NULL
        AND deleted_at IS NULL;

'