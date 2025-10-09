-- Debug de Tarefas nas Conversas Encadeadas
-- Este SQL ajuda a diagnosticar problemas com tarefas que nÃ£o marcam como concluÃ­das

-- 1. Ver todas as tarefas com seus comentÃ¡rios relacionados
SELECT
    ct.id AS task_id,
    ct.description AS task_description,
    ct.status AS task_status,
    ct.comment_id,
    ct.card_id,
    ct.assigned_to,
    ct.created_at AS task_created_at,
    cc.id AS actual_comment_id,
    cc.content AS comment_content,
    cc.thread_id,
    cc.level,
    CASE
        WHEN ct.comment_id = cc.id THEN 'âœ… MATCH'
        WHEN ct.comment_id IS NULL THEN 'âš ï¸ NULL'
        ELSE 'âŒ MISMATCH'
    END AS comment_link_status
FROM
    public.card_tasks ct
LEFT JOIN
    public.card_comments cc ON ct.comment_id = cc.id
WHERE
    ct.deleted_at IS NULL
ORDER BY
    ct.created_at DESC
LIMIT 20;

-- 2. Encontrar tarefas SEM comment_id (precisam de correÃ§Ã£o)
SELECT
    'Tarefas sem comment_id:' AS status,
    COUNT(*) AS quantidade
FROM
    public.card_tasks
WHERE
    comment_id IS NULL
    AND deleted_at IS NULL;

-- 3. Encontrar tarefas com comment_id que nÃ£o existe mais
SELECT
    ct.id AS task_id,
    ct.description,
    ct.comment_id,
    'ComentÃ¡rio nÃ£o existe' AS problema
FROM
    public.card_tasks ct
LEFT JOIN
    public.card_comments cc ON ct.comment_id = cc.id
WHERE
    ct.comment_id IS NOT NULL
    AND cc.id IS NULL
    AND ct.deleted_at IS NULL;

-- 4. Ver tarefas de um card especÃ­fico (substitua o ID)
-- SELECT
--     ct.id AS task_id,
--     ct.description,
--     ct.status,
--     ct.comment_id,
--     ct.assigned_to,
--     p.full_name AS assigned_to_name,
--     cc.content AS comment_content
-- FROM
--     public.card_tasks ct
-- LEFT JOIN
--     public.card_comments cc ON ct.comment_id = cc.id
-- LEFT JOIN
--     public.profiles p ON ct.assigned_to = p.id
-- WHERE
--     ct.card_id = 'SEU_CARD_ID_AQUI'
--     AND ct.deleted_at IS NULL
-- ORDER BY
--     ct.created_at ASC;

-- 5. EstatÃ­sticas gerais
SELECT
    'Total de tarefas ativas' AS metrica,
    COUNT(*) AS valor
FROM
    public.card_tasks
WHERE
    deleted_at IS NULL
UNION ALL
SELECT
    'Tarefas com comment_id' AS metrica,
    COUNT(*) AS valor
FROM
    public.card_tasks
WHERE
    comment_id IS NOT NULL
    AND deleted_at IS NULL
UNION ALL
SELECT
    'Tarefas sem comment_id' AS metrica,
    COUNT(*) AS valor
FROM
    public.card_tasks
WHERE
    comment_id IS NULL
    AND deleted_at IS NULL
UNION ALL
SELECT
    'Tarefas pendentes' AS metrica,
    COUNT(*) AS valor
FROM
    public.card_tasks
WHERE
    status = 'pending'
    AND deleted_at IS NULL
UNION ALL
SELECT
    'Tarefas concluÃ­das' AS metrica,
    COUNT(*) AS valor
FROM
    public.card_tasks
WHERE
    status = 'completed'
    AND deleted_at IS NULL;


