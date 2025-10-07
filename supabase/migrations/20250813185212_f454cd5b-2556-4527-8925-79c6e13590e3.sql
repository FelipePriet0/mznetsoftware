-- Create RPC function to save draft and return application_id
CREATE OR REPLACE FUNCTION public.save_draft(draft_data jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_draft_id uuid;
  v_application_id uuid;
  v_customer_id uuid;
  v_company_id uuid;
BEGIN
  -- Get user's company_id
  SELECT company_id INTO v_company_id FROM public.current_profile();
  
  -- Create or get customer record
  INSERT INTO public.customers (
    full_name,
    cpf,
    phone,
    whatsapp,
    birthplace,
    birthplace_uf,
    birth_date,
    email
  ) VALUES (
    (draft_data->'customer_data'->>'nome')::text,
    (draft_data->'customer_data'->>'cpf')::text,
    (draft_data->'customer_data'->>'telefone')::text,
    (draft_data->'customer_data'->>'whatsapp')::text,
    (draft_data->'customer_data'->>'naturalidade')::text,
    (draft_data->'customer_data'->>'uf')::text,
    (draft_data->'customer_data'->>'nascimento')::date,
    (draft_data->'customer_data'->>'email')::text
  ) 
  ON CONFLICT (cpf) 
  DO UPDATE SET
    full_name = EXCLUDED.full_name,
    phone = EXCLUDED.phone,
    whatsapp = EXCLUDED.whatsapp,
    birthplace = EXCLUDED.birthplace,
    birthplace_uf = EXCLUDED.birthplace_uf,
    birth_date = EXCLUDED.birth_date,
    email = EXCLUDED.email
  RETURNING id INTO v_customer_id;

  -- Create application record
  INSERT INTO public.applications (
    customer_id,
    company_id,
    created_by,
    is_draft,
    status
  ) VALUES (
    v_customer_id,
    v_company_id,
    auth.uid(),
    true,
    'recebido'
  ) RETURNING id INTO v_application_id;

  -- Save or update draft
  INSERT INTO public.applications_drafts (
    user_id,
    company_id,
    customer_data,
    address_data,
    employment_data,
    household_data,
    spouse_data,
    references_data,
    other_data
  ) VALUES (
    auth.uid(),
    v_company_id,
    draft_data->'customer_data',
    draft_data->'address_data',
    draft_data->'employment_data',
    draft_data->'household_data',
    draft_data->'spouse_data',
    draft_data->'references_data',
    draft_data->'other_data'
  )
  ON CONFLICT (user_id) 
  DO UPDATE SET
    customer_data = EXCLUDED.customer_data,
    address_data = EXCLUDED.address_data,
    employment_data = EXCLUDED.employment_data,
    household_data = EXCLUDED.household_data,
    spouse_data = EXCLUDED.spouse_data,
    references_data = EXCLUDED.references_data,
    other_data = EXCLUDED.other_data,
    updated_at = now()
  RETURNING id INTO v_draft_id;

  RETURN v_application_id;
END;
$$;