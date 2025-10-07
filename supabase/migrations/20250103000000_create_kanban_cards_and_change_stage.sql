-- Create kanban_cards table for the new backend
CREATE TABLE IF NOT EXISTS public.kanban_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  applicant_id uuid REFERENCES public.applicants(id) ON DELETE CASCADE,
  person_type public.person_type NOT NULL DEFAULT 'PF',
  area text NOT NULL DEFAULT 'comercial' CHECK (area IN ('analise', 'comercial')),
  stage text NOT NULL DEFAULT 'entrada' CHECK (stage IN (
    'recebido', 'em_analise', 'reanalise', 'aprovado', 'negado', 'finalizado',
    'entrada', 'feitas', 'aguardando_doc', 'canceladas', 'concluidas'
  )),
  assignee_id uuid REFERENCES public.profiles(id),
  title text NOT NULL,
  cpf_cnpj text,
  phone text,
  email text,
  received_at timestamptz NOT NULL DEFAULT now(),
  due_at timestamptz,
  priority text DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  source text,
  labels text[] DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create applicants table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.applicants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person_type public.person_type NOT NULL DEFAULT 'PF',
  primary_name text NOT NULL,
  cpf_cnpj text,
  phone text,
  email text,
  city text,
  uf text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_kanban_cards_area_stage ON public.kanban_cards(area, stage);
CREATE INDEX IF NOT EXISTS idx_kanban_cards_assignee ON public.kanban_cards(assignee_id);
CREATE INDEX IF NOT EXISTS idx_kanban_cards_applicant ON public.kanban_cards(applicant_id);
CREATE INDEX IF NOT EXISTS idx_kanban_cards_created_at ON public.kanban_cards(created_at);

-- Enable RLS
ALTER TABLE public.kanban_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applicants ENABLE ROW LEVEL SECURITY;

-- RLS Policies for kanban_cards
CREATE POLICY "kanban_cards_select_all" ON public.kanban_cards
  FOR SELECT USING (true);

CREATE POLICY "kanban_cards_insert_authenticated" ON public.kanban_cards
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "kanban_cards_update_authenticated" ON public.kanban_cards
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "kanban_cards_delete_authenticated" ON public.kanban_cards
  FOR DELETE USING (auth.role() = 'authenticated');

-- RLS Policies for applicants
CREATE POLICY "applicants_select_all" ON public.applicants
  FOR SELECT USING (true);

CREATE POLICY "applicants_insert_authenticated" ON public.applicants
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "applicants_update_authenticated" ON public.applicants
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_kanban_cards_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_update_kanban_cards_updated_at
  BEFORE UPDATE ON public.kanban_cards
  FOR EACH ROW
  EXECUTE FUNCTION public.update_kanban_cards_updated_at();

-- Create the change_stage RPC function
CREATE OR REPLACE FUNCTION public.change_stage(
  p_card_id uuid,
  p_to_area text,
  p_to_stage text,
  p_comment text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Validate parameters
  IF p_to_area NOT IN ('analise', 'comercial') THEN
    RAISE EXCEPTION 'Invalid area: %', p_to_area;
  END IF;

  IF p_to_area = 'analise' AND p_to_stage NOT IN ('recebido', 'em_analise', 'reanalise', 'aprovado', 'negado', 'finalizado') THEN
    RAISE EXCEPTION 'Invalid analysis stage: %', p_to_stage;
  END IF;

  IF p_to_area = 'comercial' AND p_to_stage NOT IN ('entrada', 'feitas', 'aguardando_doc', 'canceladas', 'concluidas') THEN
    RAISE EXCEPTION 'Invalid commercial stage: %', p_to_stage;
  END IF;

  -- Update the card
  UPDATE public.kanban_cards
  SET 
    area = p_to_area,
    stage = p_to_stage,
    updated_at = now()
  WHERE id = p_card_id;

  -- Check if update was successful
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Card not found: %', p_card_id;
  END IF;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.change_stage(uuid, text, text, text) TO authenticated;

-- Create route_application function for kanban_cards
CREATE OR REPLACE FUNCTION public.route_application(p_app_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pick uuid;
BEGIN
  -- For now, return null (no automatic routing)
  -- This can be enhanced later with actual routing logic
  RETURN NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION public.route_application(uuid) TO authenticated;
