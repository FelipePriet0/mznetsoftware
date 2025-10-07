-- Harden function search_path on helper functions
CREATE OR REPLACE FUNCTION public.current_profile()
RETURNS public.profiles
LANGUAGE sql STABLE
SET search_path = public
AS $$
  SELECT p.* FROM public.profiles p WHERE p.id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_premium()
RETURNS boolean
LANGUAGE sql STABLE
SET search_path = public
AS $$
  SELECT (SELECT role FROM public.current_profile()) = 'analista_premium'::public.user_role;
$$;

CREATE OR REPLACE FUNCTION public.same_company(target uuid)
RETURNS boolean
LANGUAGE sql STABLE
SET search_path = public
AS $$
  SELECT (SELECT company_id FROM public.current_profile()) = target;
$$;

CREATE OR REPLACE FUNCTION public.guard_reanalyst_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
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

-- Enable RLS on new tables and add minimal safe policies
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Companies: allow authenticated users to read companies
DROP POLICY IF EXISTS companies_select_all ON public.companies;
CREATE POLICY companies_select_all
ON public.companies
FOR SELECT
TO authenticated
USING (true);

-- Profiles policies: users can read and update only their own profile
DROP POLICY IF EXISTS profiles_select_own ON public.profiles;
DROP POLICY IF EXISTS profiles_update_own ON public.profiles;
DROP POLICY IF EXISTS profiles_insert_self ON public.profiles;

CREATE POLICY profiles_select_own
ON public.profiles
FOR SELECT
TO authenticated
USING (id = auth.uid());

CREATE POLICY profiles_update_own
ON public.profiles
FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- Optional: allow insert by authenticated only for their own id (normally handled by trigger)
CREATE POLICY profiles_insert_self
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (id = auth.uid());