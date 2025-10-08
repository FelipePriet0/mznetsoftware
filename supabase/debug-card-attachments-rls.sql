-- Debug: Ver todas as polÃ­ticas RLS da tabela card_attachments
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
WHERE tablename = 'card_attachments'
ORDER BY policyname;
