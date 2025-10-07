-- Drop IE column from customers if exists
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema='public' AND table_name='customers' AND column_name='ie'
  ) THEN
    ALTER TABLE public.customers DROP COLUMN ie;
  END IF;
END $$;

