-- Create applications_drafts table for partial saves
CREATE TABLE public.applications_drafts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  customer_data JSONB,
  address_data JSONB, 
  employment_data JSONB,
  household_data JSONB,
  spouse_data JSONB,
  references_data JSONB,
  other_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  company_id UUID
);

-- Create deleted_applications table for soft deletes
CREATE TABLE public.deleted_applications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  original_application_id UUID NOT NULL,
  snapshot JSONB NOT NULL,
  deleted_by UUID NOT NULL,
  deleted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  company_id UUID,
  customer_name TEXT,
  customer_cpf TEXT,
  reason TEXT
);

-- Enable RLS
ALTER TABLE public.applications_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deleted_applications ENABLE ROW LEVEL SECURITY;

-- RLS policies for applications_drafts
CREATE POLICY "drafts_insert_own" ON public.applications_drafts
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "drafts_select_own" ON public.applications_drafts  
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "drafts_update_own" ON public.applications_drafts
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "drafts_delete_own" ON public.applications_drafts
  FOR DELETE USING (user_id = auth.uid());

-- RLS policies for deleted_applications
CREATE POLICY "deleted_select_same_company" ON public.deleted_applications
  FOR SELECT USING (same_company(company_id) OR is_premium());

CREATE POLICY "deleted_insert_same_company" ON public.deleted_applications
  FOR INSERT WITH CHECK (same_company(company_id) OR is_premium());

-- Add is_draft column to applications
ALTER TABLE public.applications ADD COLUMN is_draft BOOLEAN DEFAULT false;

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for applications_drafts
CREATE TRIGGER update_applications_drafts_updated_at
  BEFORE UPDATE ON public.applications_drafts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to safely delete application
CREATE OR REPLACE FUNCTION public.delete_application_safely(
  p_app_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_snapshot JSONB;
  v_customer_name TEXT;
  v_customer_cpf TEXT;
  v_company_id UUID;
  v_deleted_id UUID;
BEGIN
  -- Get application data for snapshot
  SELECT 
    row_to_json(a.*),
    c.full_name,
    c.cpf,
    a.company_id
  INTO v_snapshot, v_customer_name, v_customer_cpf, v_company_id
  FROM public.applications a
  LEFT JOIN public.customers c ON c.id = a.customer_id
  WHERE a.id = p_app_id;

  IF v_snapshot IS NULL THEN
    RAISE EXCEPTION 'Application not found';
  END IF;

  -- Create deleted record
  INSERT INTO public.deleted_applications (
    original_application_id,
    snapshot,
    deleted_by,
    company_id,
    customer_name,
    customer_cpf,
    reason
  ) VALUES (
    p_app_id,
    v_snapshot,
    auth.uid(),
    v_company_id,
    v_customer_name,
    v_customer_cpf,
    p_reason
  ) RETURNING id INTO v_deleted_id;

  -- Delete the application and related data
  DELETE FROM public.references_personal WHERE application_id = p_app_id;
  DELETE FROM public.spouse WHERE application_id = p_app_id;
  DELETE FROM public.household WHERE application_id = p_app_id;
  DELETE FROM public.employment WHERE application_id = p_app_id;
  DELETE FROM public.application_address WHERE application_id = p_app_id;
  DELETE FROM public.attachments WHERE application_id = p_app_id;
  DELETE FROM public.appointments WHERE application_id = p_app_id;
  DELETE FROM public.applications WHERE id = p_app_id;

  RETURN v_deleted_id;
END;
$$;