-- DiagnÃ³stico de RLS para card_tasks
-- Ver todas as polÃ­ticas RLS atuais

SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM 
    pg_policies 
WHERE 
    tablename = 'card_tasks'
ORDER BY 
    policyname;

-- Ver se RLS estÃ¡ habilitado
SELECT 
    tablename,
    rowsecurity as rls_enabled
FROM 
    pg_tables 
WHERE 
    tablename = 'card_tasks';

