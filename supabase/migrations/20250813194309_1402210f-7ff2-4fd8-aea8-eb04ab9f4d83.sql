-- Verificar se o enum user_role tem analista_senior (pode não existir)
-- Se existir, remover ou migrar para analista_premium

-- Adicionar campos necessários na tabela applications_drafts
ALTER TABLE public.applications_drafts 
ADD COLUMN IF NOT EXISTS application_id uuid REFERENCES public.applications(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS step text DEFAULT 'basic';

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_applications_drafts_application_id ON public.applications_drafts(application_id);
CREATE INDEX IF NOT EXISTS idx_applications_drafts_user_id ON public.applications_drafts(user_id);

-- Adicionar campo para retomada automática na tabela profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS current_edit_application_id uuid;

-- Criar função is_senior como alias para is_premium
CREATE OR REPLACE FUNCTION public.is_senior()
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $$
  SELECT public.is_premium(); -- alias, sem novo papel
$$;

-- Atualizar trigger para limpar updated_at na tabela applications_drafts
CREATE OR REPLACE FUNCTION public.update_applications_drafts_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Aplicar trigger se não existir
DROP TRIGGER IF EXISTS update_applications_drafts_updated_at_trigger ON public.applications_drafts;
CREATE TRIGGER update_applications_drafts_updated_at_trigger
BEFORE UPDATE ON public.applications_drafts
FOR EACH ROW
EXECUTE FUNCTION public.update_applications_drafts_updated_at();