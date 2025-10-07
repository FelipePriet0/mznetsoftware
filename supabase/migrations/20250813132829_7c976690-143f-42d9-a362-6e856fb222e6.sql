-- ===================================================
-- 1. TABELA DE HISTÓRICO (idempotente)
-- ===================================================

-- Criar enum app_status se não existir
DO $$ BEGIN
    CREATE TYPE public.app_status AS ENUM ('recebido', 'pendente', 'aprovado', 'negado', 'reanalisar');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Criar tabela application_history (idempotente)
CREATE TABLE IF NOT EXISTS public.application_history (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id uuid NOT NULL,
    company_id uuid,
    status_final public.app_status NOT NULL CHECK (status_final IN ('aprovado', 'negado')),
    
    -- Metadados de colaboradores
    colaborador_comercial_id uuid,
    colaborador_analise_id uuid, 
    colaborador_reanalise_id uuid,
    decided_by uuid,
    
    -- Dados do cliente (denormalizados)
    customer_name text,
    customer_cpf text,
    
    -- Campos específicos solicitados (denormalizados)
    emprego text,
    tipo_de_moradia text,
    obs text,
    ps text,
    
    -- Pareceres
    decision_comment text,
    reanalysis_notes text,
    
    -- Snapshot completo da ficha
    snapshot jsonb,
    
    -- Timestamp da decisão
    decided_at timestamptz NOT NULL DEFAULT now(),
    
    -- Constraint de unicidade para evitar duplicatas
    UNIQUE(application_id, status_final)
);

-- Ativar RLS
ALTER TABLE public.application_history ENABLE ROW LEVEL SECURITY;

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_application_history_company_id ON public.application_history (company_id);
CREATE INDEX IF NOT EXISTS idx_application_history_status_final ON public.application_history (status_final);
CREATE INDEX IF NOT EXISTS idx_application_history_customer_cpf ON public.application_history (customer_cpf);
CREATE INDEX IF NOT EXISTS idx_application_history_decided_at ON public.application_history (decided_at);

-- ===================================================
-- 2. RLS POLICIES
-- ===================================================

-- Drop existing policies se existirem
DROP POLICY IF EXISTS "history_select_same_company" ON public.application_history;
DROP POLICY IF EXISTS "history_select_premium_all" ON public.application_history;

-- Política: usuários da mesma empresa podem ver
CREATE POLICY "history_select_same_company" 
ON public.application_history FOR SELECT 
USING (public.same_company(company_id));

-- Política: analista premium vê tudo
CREATE POLICY "history_select_premium_all" 
ON public.application_history FOR SELECT 
USING (public.is_premium());

-- ===================================================
-- 3. FUNÇÃO E TRIGGER PARA CAPTURAR HISTÓRICO
-- ===================================================

-- Função para capturar dados no histórico
CREATE OR REPLACE FUNCTION public.capture_application_history()
RETURNS TRIGGER AS $$
DECLARE
    customer_rec record;
    employment_rec record;
    address_rec record;
    full_snapshot jsonb;
BEGIN
    -- Só processa quando muda para aprovado ou negado
    IF NEW.status NOT IN ('aprovado', 'negado') THEN
        RETURN NEW;
    END IF;
    
    -- Só processa se houve mudança de status
    IF OLD IS NOT NULL AND OLD.status = NEW.status THEN
        RETURN NEW;
    END IF;
    
    -- Buscar dados do customer
    SELECT * INTO customer_rec 
    FROM public.customers 
    WHERE id = NEW.customer_id;
    
    -- Buscar dados de emprego
    SELECT * INTO employment_rec 
    FROM public.employment 
    WHERE application_id = NEW.id;
    
    -- Buscar dados de endereço
    SELECT * INTO address_rec 
    FROM public.application_address 
    WHERE application_id = NEW.id;
    
    -- Montar snapshot completo
    full_snapshot := jsonb_build_object(
        'application', to_jsonb(NEW),
        'customer', to_jsonb(customer_rec),
        'employment', to_jsonb(employment_rec),
        'address', to_jsonb(address_rec)
    );
    
    -- Inserir ou atualizar no histórico
    INSERT INTO public.application_history (
        application_id,
        company_id,
        status_final,
        colaborador_comercial_id,
        colaborador_analise_id,
        colaborador_reanalise_id,
        decided_by,
        customer_name,
        customer_cpf,
        emprego,
        tipo_de_moradia,
        obs,
        ps,
        decision_comment,
        reanalysis_notes,
        snapshot,
        decided_at
    ) VALUES (
        NEW.id,
        NEW.company_id,
        NEW.status::public.app_status,
        NEW.created_by,  -- colaborador comercial (quem criou)
        NEW.analyst_id,  -- colaborador analista
        NEW.assigned_reanalyst,  -- colaborador reanalista
        auth.uid(),  -- quem decidiu (usuário atual)
        customer_rec.full_name,
        customer_rec.cpf,
        employment_rec.profession,  -- mapear emprego -> profession
        address_rec.housing_type,   -- mapear tipo_de_moradia -> housing_type
        NEW.comments,               -- mapear obs -> comments
        NEW.reanalysis_notes,       -- ps será o reanalysis_notes por ora
        NEW.comments,               -- decision_comment
        NEW.reanalysis_notes,
        full_snapshot,
        now()
    )
    ON CONFLICT (application_id, status_final) 
    DO UPDATE SET
        company_id = EXCLUDED.company_id,
        colaborador_comercial_id = EXCLUDED.colaborador_comercial_id,
        colaborador_analise_id = EXCLUDED.colaborador_analise_id,
        colaborador_reanalise_id = EXCLUDED.colaborador_reanalise_id,
        decided_by = EXCLUDED.decided_by,
        customer_name = EXCLUDED.customer_name,
        customer_cpf = EXCLUDED.customer_cpf,
        emprego = EXCLUDED.emprego,
        tipo_de_moradia = EXCLUDED.tipo_de_moradia,
        obs = EXCLUDED.obs,
        ps = EXCLUDED.ps,
        decision_comment = EXCLUDED.decision_comment,
        reanalysis_notes = EXCLUDED.reanalysis_notes,
        snapshot = EXCLUDED.snapshot,
        decided_at = EXCLUDED.decided_at;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Criar trigger
DROP TRIGGER IF EXISTS trg_capture_application_history ON public.applications;
CREATE TRIGGER trg_capture_application_history
    AFTER UPDATE ON public.applications
    FOR EACH ROW
    EXECUTE FUNCTION public.capture_application_history();

-- ===================================================
-- 4. VIEWS PARA O FRONTEND
-- ===================================================

-- View para listagem
CREATE OR REPLACE VIEW public.view_history_list AS
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
    c.name as company_name,
    c.logo_url as company_logo,
    p_comercial.full_name as comercial_name,
    p_analista.full_name as analista_name,
    p_reanalista.full_name as reanalista_name,
    p_decided.full_name as decided_by_name
FROM public.application_history h
LEFT JOIN public.companies c ON h.company_id = c.id
LEFT JOIN public.profiles p_comercial ON h.colaborador_comercial_id = p_comercial.id
LEFT JOIN public.profiles p_analista ON h.colaborador_analise_id = p_analista.id
LEFT JOIN public.profiles p_reanalista ON h.colaborador_reanalise_id = p_reanalista.id
LEFT JOIN public.profiles p_decided ON h.decided_by = p_decided.id;

-- View para detalhes
CREATE OR REPLACE VIEW public.view_history_detail AS
SELECT 
    h.*,
    c.name as company_name,
    c.logo_url as company_logo,
    p_comercial.full_name as comercial_name,
    p_analista.full_name as analista_name,
    p_reanalista.full_name as reanalista_name,
    p_decided.full_name as decided_by_name
FROM public.application_history h
LEFT JOIN public.companies c ON h.company_id = c.id
LEFT JOIN public.profiles p_comercial ON h.colaborador_comercial_id = p_comercial.id
LEFT JOIN public.profiles p_analista ON h.colaborador_analise_id = p_analista.id
LEFT JOIN public.profiles p_reanalista ON h.colaborador_reanalise_id = p_reanalista.id
LEFT JOIN public.profiles p_decided ON h.decided_by = p_decided.id;

-- ===================================================
-- 5. PREPARAÇÃO PARA INADIMPLÊNCIA (FASE 2)
-- ===================================================

-- Tabela de inadimplência
CREATE TABLE IF NOT EXISTS public.delinquencies (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    cpf text NOT NULL,
    reference_date date NOT NULL,
    amount numeric,
    status text,
    source text,
    created_at timestamptz DEFAULT now()
);

-- Índice para performance
CREATE INDEX IF NOT EXISTS idx_delinquencies_cpf_date ON public.delinquencies (cpf, reference_date);

-- RLS para inadimplência (só premium por ora)
ALTER TABLE public.delinquencies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "delinquencies_premium_only" ON public.delinquencies;
CREATE POLICY "delinquencies_premium_only" 
ON public.delinquencies FOR ALL 
USING (public.is_premium());

-- View combinada com inadimplência
CREATE OR REPLACE VIEW public.v_history_with_delinquency AS
SELECT 
    h.*,
    CASE 
        WHEN d.cpf IS NOT NULL THEN true 
        ELSE false 
    END as is_delinquent,
    d.amount as last_amount,
    d.reference_date as last_reference
FROM public.view_history_list h
LEFT JOIN (
    SELECT DISTINCT ON (cpf) 
        cpf, amount, reference_date
    FROM public.delinquencies 
    ORDER BY cpf, reference_date DESC
) d ON h.customer_cpf = d.cpf;

-- ===================================================
-- 6. BUCKET DE IMPORTS (se não existir)
-- ===================================================

-- Inserir bucket imports se não existir
INSERT INTO storage.buckets (id, name, public) 
VALUES ('imports', 'imports', false)
ON CONFLICT (id) DO NOTHING;

-- Política para uploads (só premium)
DO $$
BEGIN
    -- Tentar criar política
    INSERT INTO storage.policies (id, bucket_id, command, using_expression)
    VALUES (
        'imports_premium_upload',
        'imports',
        'INSERT',
        'public.is_premium()'
    )
    ON CONFLICT (id) DO NOTHING;
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;

-- ===================================================
-- CONCLUÍDO
-- ===================================================