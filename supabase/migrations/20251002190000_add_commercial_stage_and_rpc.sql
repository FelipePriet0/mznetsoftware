-- Add enum type for commercial stage
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'commercial_stage') THEN
    CREATE TYPE public.commercial_stage AS ENUM ('entrada','feitas','aguardando','canceladas','concluidas');
  END IF;
END $$;

-- Add column to applications
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'applications' AND column_name = 'commercial_stage'
  ) THEN
    ALTER TABLE public.applications
      ADD COLUMN commercial_stage public.commercial_stage NOT NULL DEFAULT 'entrada';
  END IF;
END $$;

-- RPC to set commercial stage with security
CREATE OR REPLACE FUNCTION public.applications_set_commercial_stage(
  p_app_id uuid,
  p_stage public.commercial_stage
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_company uuid;
BEGIN
  -- Ensure the caller belongs to the same company of the application
  SELECT company_id INTO v_company FROM public.applications WHERE id = p_app_id;
  IF v_company IS NULL THEN
    RAISE EXCEPTION 'Application not found';
  END IF;
  IF NOT public.same_company(v_company) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  UPDATE public.applications
  SET commercial_stage = p_stage
  WHERE id = p_app_id;
END;
$$;

REVOKE ALL ON FUNCTION public.applications_set_commercial_stage(uuid, public.commercial_stage) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.applications_set_commercial_stage(uuid, public.commercial_stage) TO authenticated;

