-- Fill company_id automatically from current_profile() if not provided
DROP TRIGGER IF EXISTS applications_set_company_id ON public.applications;
CREATE TRIGGER applications_set_company_id
BEFORE INSERT ON public.applications
FOR EACH ROW
EXECUTE FUNCTION public.fill_application_company_id();

-- Ensure SELECT policy exists for segmentation (only if not already configured)
-- Note: Existing policy "apps_select" already enforces (same_company(company_id) OR is_premium()).
-- We keep it as-is to satisfy the requirement without creating duplicates.