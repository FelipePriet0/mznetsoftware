-- Person type for customers
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'person_type') THEN
    CREATE TYPE public.person_type AS ENUM ('PF','PJ');
  END IF;
END $$;

-- Add PJ fields to customers (if missing)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='customers' AND column_name='person_type') THEN
    ALTER TABLE public.customers ADD COLUMN person_type public.person_type NOT NULL DEFAULT 'PF';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='customers' AND column_name='cnpj') THEN
    ALTER TABLE public.customers ADD COLUMN cnpj text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='customers' AND column_name='ie') THEN
    ALTER TABLE public.customers ADD COLUMN ie text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='customers' AND column_name='corporate_name') THEN
    ALTER TABLE public.customers ADD COLUMN corporate_name text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='customers' AND column_name='trade_name') THEN
    ALTER TABLE public.customers ADD COLUMN trade_name text;
  END IF;
  -- Address fields (if not yet present)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='customers' AND column_name='street') THEN
    ALTER TABLE public.customers ADD COLUMN street text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='customers' AND column_name='number') THEN
    ALTER TABLE public.customers ADD COLUMN number text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='customers' AND column_name='district') THEN
    ALTER TABLE public.customers ADD COLUMN district text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='customers' AND column_name='city') THEN
    ALTER TABLE public.customers ADD COLUMN city text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='customers' AND column_name='uf') THEN
    ALTER TABLE public.customers ADD COLUMN uf text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='customers' AND column_name='cep') THEN
    ALTER TABLE public.customers ADD COLUMN cep text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='customers' AND column_name='complement') THEN
    ALTER TABLE public.customers ADD COLUMN complement text;
  END IF;
END $$;

-- Plans catalog
CREATE TABLE IF NOT EXISTS public.plans (
  code text PRIMARY KEY,
  name text NOT NULL,
  download_mbps integer,
  upload_mbps integer,
  price_cents integer,
  active boolean NOT NULL DEFAULT true
);

-- PJ details for applications
CREATE TABLE IF NOT EXISTS public.application_pj_details (
  application_id uuid PRIMARY KEY REFERENCES public.applications(id) ON DELETE CASCADE,
  plan_code text REFERENCES public.plans(code),
  billing_day integer NOT NULL,
  partners jsonb NOT NULL DEFAULT '[]'::jsonb,
  extra jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.touch_application_pj_details()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;$$;

DROP TRIGGER IF EXISTS trg_touch_application_pj_details ON public.application_pj_details;
CREATE TRIGGER trg_touch_application_pj_details BEFORE UPDATE ON public.application_pj_details FOR EACH ROW EXECUTE FUNCTION public.touch_application_pj_details();

