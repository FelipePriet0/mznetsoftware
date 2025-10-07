-- Fix Security Definer Views by recreating them with proper security
-- This ensures views respect RLS policies of the querying user

-- Drop existing views (in dependency order)
DROP VIEW IF EXISTS public.v_history_with_delinquency;
DROP VIEW IF EXISTS public.v_delinquency_by_analyst;
DROP VIEW IF EXISTS public.view_history_detail;
DROP VIEW IF EXISTS public.view_history_list;
DROP VIEW IF EXISTS public.v_app_cohort;

-- Recreate v_app_cohort without SECURITY DEFINER
CREATE VIEW public.v_app_cohort AS
SELECT 
    id AS application_id,
    (date_trunc('month'::text, (received_at)::timestamp with time zone))::date AS cohort_month,
    analyst_id,
    analyst_name
FROM applications a;

-- Recreate view_history_list without SECURITY DEFINER
CREATE VIEW public.view_history_list AS
SELECT 
    h.id,
    h.application_id,
    h.company_id,
    h.status_final,
    h.customer_name,
    h.customer_cpf,
    h.colaborador_comercial_id,
    h.colaborador_analise_id,
    h.colaborador_reanalise_id,
    h.decided_by,
    h.decided_at,
    c.name AS company_name,
    c.logo_url AS company_logo,
    p_comercial.full_name AS comercial_name,
    p_analista.full_name AS analista_name,
    p_reanalista.full_name AS reanalista_name,
    p_decided.full_name AS decided_by_name
FROM application_history h
LEFT JOIN companies c ON (h.company_id = c.id)
LEFT JOIN profiles p_comercial ON (h.colaborador_comercial_id = p_comercial.id)
LEFT JOIN profiles p_analista ON (h.colaborador_analise_id = p_analista.id)
LEFT JOIN profiles p_reanalista ON (h.colaborador_reanalise_id = p_reanalista.id)
LEFT JOIN profiles p_decided ON (h.decided_by = p_decided.id);

-- Recreate view_history_detail without SECURITY DEFINER
CREATE VIEW public.view_history_detail AS
SELECT 
    h.id,
    h.application_id,
    h.company_id,
    h.status_final,
    h.colaborador_comercial_id,
    h.colaborador_analise_id,
    h.colaborador_reanalise_id,
    h.decided_by,
    h.customer_name,
    h.customer_cpf,
    h.emprego,
    h.tipo_de_moradia,
    h.obs,
    h.ps,
    h.decision_comment,
    h.reanalysis_notes,
    h.snapshot,
    h.decided_at,
    c.name AS company_name,
    c.logo_url AS company_logo,
    p_comercial.full_name AS comercial_name,
    p_analista.full_name AS analista_name,
    p_reanalista.full_name AS reanalista_name,
    p_decided.full_name AS decided_by_name
FROM application_history h
LEFT JOIN companies c ON (h.company_id = c.id)
LEFT JOIN profiles p_comercial ON (h.colaborador_comercial_id = p_comercial.id)
LEFT JOIN profiles p_analista ON (h.colaborador_analise_id = p_analista.id)
LEFT JOIN profiles p_reanalista ON (h.colaborador_reanalise_id = p_reanalista.id)
LEFT JOIN profiles p_decided ON (h.decided_by = p_decided.id);

-- Recreate v_delinquency_by_analyst without SECURITY DEFINER
CREATE VIEW public.v_delinquency_by_analyst AS
SELECT 
    c.cohort_month,
    c.analyst_id,
    c.analyst_name,
    count(*) AS total_fichas_coorte,
    sum(CASE WHEN af.status_30d THEN 1 ELSE 0 END) AS inad_30d,
    round(((100.0 * (sum(CASE WHEN af.status_30d THEN 1 ELSE 0 END))::numeric) / (NULLIF(count(*), 0))::numeric), 2) AS pct_inad_30d,
    sum(CASE WHEN af.status_60d THEN 1 ELSE 0 END) AS inad_60d,
    round(((100.0 * (sum(CASE WHEN af.status_60d THEN 1 ELSE 0 END))::numeric) / (NULLIF(count(*), 0))::numeric), 2) AS pct_inad_60d,
    sum(CASE WHEN af.status_90d THEN 1 ELSE 0 END) AS inad_90d,
    round(((100.0 * (sum(CASE WHEN af.status_90d THEN 1 ELSE 0 END))::numeric) / (NULLIF(count(*), 0))::numeric), 2) AS pct_inad_90d
FROM v_app_cohort c
JOIN application_financial af ON (af.application_id = c.application_id)
GROUP BY c.cohort_month, c.analyst_id, c.analyst_name;

-- Recreate v_history_with_delinquency without SECURITY DEFINER
CREATE VIEW public.v_history_with_delinquency AS
SELECT 
    h.id,
    h.application_id,
    h.company_id,
    h.status_final,
    h.customer_name,
    h.customer_cpf,
    h.colaborador_comercial_id,
    h.colaborador_analise_id,
    h.colaborador_reanalise_id,
    h.decided_by,
    h.decided_at,
    h.company_name,
    h.company_logo,
    h.comercial_name,
    h.analista_name,
    h.reanalista_name,
    h.decided_by_name,
    CASE WHEN (d.cpf IS NOT NULL) THEN true ELSE false END AS is_delinquent,
    d.amount AS last_amount,
    d.reference_date AS last_reference
FROM view_history_list h
LEFT JOIN (
    SELECT DISTINCT ON (delinquencies.cpf) 
        delinquencies.cpf,
        delinquencies.amount,
        delinquencies.reference_date
    FROM delinquencies
    ORDER BY delinquencies.cpf, delinquencies.reference_date DESC
) d ON (h.customer_cpf = d.cpf);

-- Grant appropriate permissions to authenticated users
GRANT SELECT ON public.v_app_cohort TO authenticated;
GRANT SELECT ON public.view_history_list TO authenticated;
GRANT SELECT ON public.view_history_detail TO authenticated;
GRANT SELECT ON public.v_delinquency_by_analyst TO authenticated;
GRANT SELECT ON public.v_history_with_delinquency TO authenticated;