-- Create DELETE policies for all tables used in delete_application_safely function

-- Applications table - allow delete for same company users or premium
CREATE POLICY "apps_delete_same_company" 
ON public.applications 
FOR DELETE 
USING (same_company(company_id) OR is_premium());

-- Customers table - allow delete (used via SECURITY DEFINER function)
CREATE POLICY "customers_delete_all" 
ON public.customers 
FOR DELETE 
USING (true);

-- Employment table - allow delete via application foreign key
CREATE POLICY "employment_delete_via_app" 
ON public.employment 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM public.applications a 
  WHERE a.id = employment.application_id 
  AND (same_company(a.company_id) OR is_premium())
));

-- Application address table - allow delete via application foreign key
CREATE POLICY "address_delete_via_app" 
ON public.application_address 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM public.applications a 
  WHERE a.id = application_address.application_id 
  AND (same_company(a.company_id) OR is_premium())
));

-- References personal table - allow delete via application foreign key
CREATE POLICY "refs_delete_via_app" 
ON public.references_personal 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM public.applications a 
  WHERE a.id = references_personal.application_id 
  AND (same_company(a.company_id) OR is_premium())
));

-- Spouse table - allow delete via application foreign key
CREATE POLICY "spouse_delete_via_app" 
ON public.spouse 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM public.applications a 
  WHERE a.id = spouse.application_id 
  AND (same_company(a.company_id) OR is_premium())
));

-- Household table - allow delete via application foreign key
CREATE POLICY "household_delete_via_app" 
ON public.household 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM public.applications a 
  WHERE a.id = household.application_id 
  AND (same_company(a.company_id) OR is_premium())
));

-- Attachments table - allow delete via application foreign key
CREATE POLICY "attachments_delete_via_app" 
ON public.attachments 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM public.applications a 
  WHERE a.id = attachments.application_id 
  AND (same_company(a.company_id) OR is_premium())
));

-- Appointments table - allow delete for same company or premium
CREATE POLICY "appointments_delete_same_company" 
ON public.appointments 
FOR DELETE 
USING (same_company(company_id) OR is_premium());