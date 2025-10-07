-- Ensure applications get current user's company_id on insert when not provided
CREATE OR REPLACE FUNCTION public.fill_application_company_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_company uuid;
BEGIN
  SELECT company_id INTO v_company FROM public.current_profile();

  -- Only set if incoming row doesn't specify company_id
  IF NEW.company_id IS NULL THEN
    NEW.company_id = v_company;
  END IF;

  RETURN NEW;
END;
$$;

-- Recreate trigger idempotently
DROP TRIGGER IF EXISTS trg_fill_application_company_id ON public.applications;
CREATE TRIGGER trg_fill_application_company_id
BEFORE INSERT ON public.applications
FOR EACH ROW
EXECUTE FUNCTION public.fill_application_company_id();