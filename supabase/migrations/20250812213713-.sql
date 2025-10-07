-- Guard: bloquear mudança de status no banco para role 'comercial'
CREATE OR REPLACE FUNCTION public.guard_commercial_status_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  v_role public.user_role;
BEGIN
  -- Obter o papel do usuário atual
  SELECT role INTO v_role FROM public.current_profile();

  -- Se for comercial e houver tentativa de mudar o status
  IF v_role = 'comercial' AND (NEW.status IS DISTINCT FROM OLD.status) THEN
    RAISE EXCEPTION 'Contas comerciais não podem alterar o status das fichas';
  END IF;

  RETURN NEW;
END;
$$;

-- Criar trigger (idempotente: drop se existir, depois cria)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_guard_commercial_status_update'
  ) THEN
    DROP TRIGGER trg_guard_commercial_status_update ON public.applications;
  END IF;
END;
$$;

CREATE TRIGGER trg_guard_commercial_status_update
BEFORE UPDATE ON public.applications
FOR EACH ROW
EXECUTE FUNCTION public.guard_commercial_status_update();