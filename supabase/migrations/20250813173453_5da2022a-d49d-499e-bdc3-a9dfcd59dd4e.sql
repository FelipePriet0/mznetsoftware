-- Fix applications_change_status function to properly handle company_id validation
CREATE OR REPLACE FUNCTION public.applications_change_status(p_app_id uuid, p_new_status app_status, p_comment text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_app_exists boolean;
BEGIN
  IF NOT public.is_premium() THEN
    RAISE EXCEPTION 'Apenas analista_premium pode mudar status';
  END IF;

  -- Check if application exists (regardless of company_id)
  SELECT EXISTS(SELECT 1 FROM public.applications WHERE id = p_app_id) INTO v_app_exists;
  
  IF NOT v_app_exists THEN
    RAISE EXCEPTION 'Aplicação não encontrada';
  END IF;

  -- Update the application status
  UPDATE public.applications
     SET status = p_new_status::text,
         comments = COALESCE(p_comment, comments)
   WHERE id = p_app_id;
END;
$function$;