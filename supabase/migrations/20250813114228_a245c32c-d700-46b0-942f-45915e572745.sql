-- Add assigned_reanalyst column to applications table
ALTER TABLE public.applications 
  ADD COLUMN IF NOT EXISTS assigned_reanalyst UUID REFERENCES public.profiles(id);

-- Create useful indexes
CREATE INDEX IF NOT EXISTS idx_app_company ON public.applications(company_id);
CREATE INDEX IF NOT EXISTS idx_app_assigned_reanalyst ON public.applications(assigned_reanalyst);
CREATE INDEX IF NOT EXISTS idx_profiles_role_company ON public.profiles(role, company_id);

-- Function to count current workload of a reanalyst (by company)
-- Consider "active tasks" as status: aprovado | negado | reanalisar
CREATE OR REPLACE FUNCTION public.reanalyst_workload(p_reanalyst UUID)
RETURNS INTEGER
LANGUAGE SQL STABLE
AS $$
  SELECT COUNT(*)::INT
  FROM public.applications a
  WHERE a.assigned_reanalyst = p_reanalyst
    AND a.status IN ('aprovado','negado','reanalisar');
$$;

-- Pick reanalyst with lowest workload (same company)
-- Selects reanalyst from SAME COMPANY with lowest workload; in case of tie, breaks randomly
CREATE OR REPLACE FUNCTION public.pick_reanalyst_for_company(p_company UUID)
RETURNS UUID
LANGUAGE SQL STABLE
AS $$
  WITH candidates AS (
    SELECT p.id,
           COALESCE((
             SELECT COUNT(*)
             FROM public.applications a
             WHERE a.assigned_reanalyst = p.id
               AND a.status IN ('aprovado','negado','reanalisar')
           ),0) AS tasks
    FROM public.profiles p
    WHERE p.role = 'reanalista'
      AND p.company_id = p_company
  )
  SELECT id
  FROM candidates
  ORDER BY tasks ASC, RANDOM()
  LIMIT 1;
$$;

-- Automatic routing (RPC + Trigger)
-- RPC: routes an application to the least busy reanalyst of the application's company
CREATE OR REPLACE FUNCTION public.route_application(p_app_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company UUID;
  v_pick UUID;
BEGIN
  SELECT company_id INTO v_company FROM public.applications WHERE id = p_app_id;
  IF v_company IS NULL THEN
    RAISE EXCEPTION 'Application not found or without company_id';
  END IF;

  v_pick := public.pick_reanalyst_for_company(v_company);

  IF v_pick IS NULL THEN
    -- If no reanalyst in company, don't fail: leave without assignment
    -- (frontend shows warning to premium)
    RETURN NULL;
  END IF;

  UPDATE public.applications
     SET assigned_reanalyst = v_pick
   WHERE id = p_app_id;

  RETURN v_pick;
END;
$$;

GRANT EXECUTE ON FUNCTION public.route_application(UUID) TO authenticated;

-- Trigger: every time status enters {aprovado|negado|reanalisar}, assign
CREATE OR REPLACE FUNCTION public.trg_route_on_status_fn()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- When inserting or changing status to one of the 3, assign if no responsible or if company/status changed
  IF NEW.status IN ('aprovado','negado','reanalisar') THEN
    IF NEW.assigned_reanalyst IS NULL
       OR (OLD IS NOT NULL AND (NEW.status IS DISTINCT FROM OLD.status OR NEW.company_id IS DISTINCT FROM OLD.company_id)) THEN
      PERFORM public.route_application(NEW.id);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_route_on_status ON public.applications;
CREATE TRIGGER trg_route_on_status
AFTER INSERT OR UPDATE OF status, company_id ON public.applications
FOR EACH ROW EXECUTE PROCEDURE public.trg_route_on_status_fn();

-- Manual reassignment (Premium only)
-- RPC for Premium to reassign when desired
CREATE OR REPLACE FUNCTION public.reassign_application(p_app_id UUID, p_reanalyst UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_premium() THEN
    RAISE EXCEPTION 'Only Premium Analyst can reassign';
  END IF;

  -- Company rules: ensure new responsible is from same company as application
  UPDATE public.applications a
     SET assigned_reanalyst = p_reanalyst
   WHERE a.id = p_app_id
     AND EXISTS (
       SELECT 1
       FROM public.profiles r
       WHERE r.id = p_reanalyst
         AND r.role = 'reanalista'
         AND r.company_id = a.company_id
     );

  -- if no row was affected, signal friendly error
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid reassignment: check company and role';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.reassign_application(UUID, UUID) TO authenticated;