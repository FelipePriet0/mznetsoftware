-- 1) Enums e estruturas básicas
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE public.user_role AS ENUM ('analista_premium','reanalista','comercial');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_status') THEN
    CREATE TYPE public.app_status AS ENUM ('pendente','aprovado','negado','reanalisar');
  END IF;
END $$;

-- Empresas
CREATE TABLE IF NOT EXISTS public.companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  code text UNIQUE,
  logo_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.companies (name, code)
VALUES ('WBR NET','WBR'), ('MZNET','MZNET')
ON CONFLICT (name) DO NOTHING;

-- Profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY,        -- = auth.users.id
  full_name text,
  role public.user_role NOT NULL DEFAULT 'comercial',
  company_id uuid REFERENCES public.companies(id)
);

-- Funções Helpers (perfil, premium, mesma empresa)
CREATE OR REPLACE FUNCTION public.current_profile()
RETURNS public.profiles
LANGUAGE sql STABLE AS $$
  SELECT p.* FROM public.profiles p WHERE p.id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_premium()
RETURNS boolean
LANGUAGE sql STABLE AS $$
  SELECT (SELECT role FROM public.current_profile()) = 'analista_premium'::public.user_role;
$$;

CREATE OR REPLACE FUNCTION public.same_company(target uuid)
RETURNS boolean
LANGUAGE sql STABLE AS $$
  SELECT (SELECT company_id FROM public.current_profile()) = target;
$$;

-- Trigger: cria profile ao novo usuário
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role, company_id)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name',''), 'comercial', NULL)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Pré-requisito nas tabelas: garantir company_id e status/reanalysis_notes
ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id),
  ADD COLUMN IF NOT EXISTS status public.app_status NOT NULL DEFAULT 'pendente',
  ADD COLUMN IF NOT EXISTS reanalysis_notes text;

ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id);

-- 2) RLS por empresa (ABAC)
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- Applications policies
DROP POLICY IF EXISTS apps_select ON public.applications;
DROP POLICY IF EXISTS apps_insert_same_company ON public.applications;
DROP POLICY IF EXISTS apps_update_same_company ON public.applications;

CREATE POLICY apps_select
ON public.applications
FOR SELECT
USING (public.same_company(company_id) OR public.is_premium());

CREATE POLICY apps_insert_same_company
ON public.applications
FOR INSERT
WITH CHECK (public.same_company(company_id) OR public.is_premium());

CREATE POLICY apps_update_same_company
ON public.applications
FOR UPDATE
USING (public.same_company(company_id) OR public.is_premium())
WITH CHECK (public.same_company(company_id) OR public.is_premium());

-- Appointments policies
DROP POLICY IF EXISTS appts_select ON public.appointments;
DROP POLICY IF EXISTS appts_insert_same_company ON public.appointments;
DROP POLICY IF EXISTS appts_update_same_company ON public.appointments;

CREATE POLICY appts_select
ON public.appointments
FOR SELECT
USING (public.same_company(company_id) OR public.is_premium());

CREATE POLICY appts_insert_same_company
ON public.appointments
FOR INSERT
WITH CHECK (public.same_company(company_id) OR public.is_premium());

CREATE POLICY appts_update_same_company
ON public.appointments
FOR UPDATE
USING (public.same_company(company_id) OR public.is_premium())
WITH CHECK (public.same_company(company_id) OR public.is_premium());

-- 3) RPC e Trigger de regras finas
-- Troca de status: apenas analista_premium
CREATE OR REPLACE FUNCTION public.applications_change_status(
  p_app_id uuid,
  p_new_status public.app_status,
  p_comment text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company uuid;
BEGIN
  IF NOT public.is_premium() THEN
    RAISE EXCEPTION 'Apenas analista_premium pode mudar status';
  END IF;

  SELECT company_id INTO v_company FROM public.applications WHERE id = p_app_id;
  IF v_company IS NULL THEN
    RAISE EXCEPTION 'Aplicação não encontrada';
  END IF;

  UPDATE public.applications
     SET status = p_new_status,
         comments = COALESCE(p_comment, comments)
   WHERE id = p_app_id;
END;
$$;

-- Restrição de reanálise: reanalista e premium podem editar reanalysis_notes, reanalista somente este campo
CREATE OR REPLACE FUNCTION public.guard_reanalyst_update()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE v_role public.user_role;
BEGIN
  SELECT role INTO v_role FROM public.current_profile();

  IF v_role = 'reanalista' THEN
    IF (row_to_json(NEW) - 'reanalysis_notes') IS DISTINCT FROM (row_to_json(OLD) - 'reanalysis_notes') THEN
      RAISE EXCEPTION 'Reanalista só pode alterar reanalysis_notes';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_reanalyst_update ON public.applications;
CREATE TRIGGER trg_guard_reanalyst_update
BEFORE UPDATE ON public.applications
FOR EACH ROW EXECUTE PROCEDURE public.guard_reanalyst_update();