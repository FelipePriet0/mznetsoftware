-- Fix remaining RLS security issues on tables without RLS enabled

-- Enable RLS on application_labels table
ALTER TABLE public.application_labels ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for application_labels
CREATE POLICY "Labels can be viewed by same company users or premium" 
ON public.application_labels 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.applications a 
    WHERE a.id = application_id 
    AND (same_company(a.company_id) OR is_premium())
  )
);

CREATE POLICY "Labels can be inserted by same company users or premium" 
ON public.application_labels 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.applications a 
    WHERE a.id = application_id 
    AND (same_company(a.company_id) OR is_premium())
  )
);

CREATE POLICY "Labels can be updated by same company users or premium" 
ON public.application_labels 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.applications a 
    WHERE a.id = application_id 
    AND (same_company(a.company_id) OR is_premium())
  )
);

CREATE POLICY "Labels can be deleted by same company users or premium" 
ON public.application_labels 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.applications a 
    WHERE a.id = application_id 
    AND (same_company(a.company_id) OR is_premium())
  )
);

-- Enable RLS on events_audit table
ALTER TABLE public.events_audit ENABLE ROW LEVEL SECURITY;

-- Create restrictive RLS policy for events_audit (admin/premium only)
CREATE POLICY "Audit events can only be viewed by premium users" 
ON public.events_audit 
FOR SELECT 
USING (is_premium());

-- Enable RLS on payments_imports table  
ALTER TABLE public.payments_imports ENABLE ROW LEVEL SECURITY;

-- Create restrictive RLS policy for payments_imports (admin/premium only)
CREATE POLICY "Payment imports can only be viewed by premium users" 
ON public.payments_imports 
FOR SELECT 
USING (is_premium());

CREATE POLICY "Payment imports can only be inserted by premium users" 
ON public.payments_imports 
FOR INSERT 
WITH CHECK (is_premium());