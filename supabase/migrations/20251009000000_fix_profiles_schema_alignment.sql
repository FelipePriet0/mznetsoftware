-- ============================================
-- CORREÃ‡ÃƒO COMPLETA DO SCHEMA PROFILES
-- Alinha banco com o estado atual do front-end
-- ============================================

-- 1. Remover company_id se existir (nÃ£o Ã© mais usado)
ALTER TABLE profiles DROP COLUMN IF EXISTS company_id;

-- 2. Remover Ã­ndices que dependem de company_id
DROP INDEX IF EXISTS idx_profiles_role_company;

-- 3. Remover funÃ§Ã£o obsoleta same_company (dependia de company_id)
DROP FUNCTION IF EXISTS public.same_company(uuid);

-- 3.1. Remover funÃ§Ãµes que dependem de current_profile antes de alterÃ¡-la
-- Para permitir mudar o tipo de retorno, precisamos dropar a funÃ§Ã£o existente
DROP FUNCTION IF EXISTS public.is_premium();
DROP FUNCTION IF EXISTS public.current_profile();

-- 4. Atualizar trigger handle_new_user para usar roles corretos e estrutura atual
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role, avatar_url)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    'vendedor'::user_role,  -- âœ… Role padrÃ£o correto (vendedor, analista, gestor)
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- 5. Atualizar current_profile para retornar estrutura correta (compatÃ­vel com front)
CREATE OR REPLACE FUNCTION public.current_profile()
RETURNS TABLE (
  id uuid,
  full_name text,
  role user_role,
  avatar_url text,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    p.id,
    p.full_name,
    p.role,
    p.avatar_url,
    p.created_at,
    p.updated_at
  FROM public.profiles p 
  WHERE p.id = auth.uid();
$$;

-- 6. Garantir que full_name pode ser NULL (para novos usuÃ¡rios)
ALTER TABLE profiles ALTER COLUMN full_name DROP NOT NULL;

-- 7. Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_updated_at ON profiles;
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

-- 8. Atualizar funÃ§Ã£o is_premium para usar roles corretos
-- (MantÃ©m compatibilidade, mas agora gestor = nÃ­vel mais alto)
CREATE OR REPLACE FUNCTION public.is_premium()
RETURNS boolean
LANGUAGE sql STABLE
SET search_path = public
AS $$
  SELECT (SELECT role FROM public.current_profile()) = 'gestor'::public.user_role;
$$;

-- 9. Limpar dados inconsistentes (se houver)
-- Remove perfis Ã³rfÃ£os que nÃ£o tÃªm usuÃ¡rio correspondente
DELETE FROM profiles 
WHERE id NOT IN (SELECT id FROM auth.users);

-- 10. Garantir que todos os usuÃ¡rios existentes tÃªm perfil
-- (Backfill para usuÃ¡rios que podem ter sido criados sem trigger)
INSERT INTO profiles (id, full_name, role, avatar_url)
SELECT 
  u.id,
  COALESCE(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1)),
  'vendedor'::user_role,
  u.raw_user_meta_data->>'avatar_url'
FROM auth.users u
LEFT JOIN profiles p ON p.id = u.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- 11. ComentÃ¡rio explicativo para futuras referÃªncias
COMMENT ON TABLE profiles IS 'Perfis de usuÃ¡rios - alinhado com front-end (roles: vendedor, analista, gestor)';
COMMENT ON COLUMN profiles.role IS 'Role do usuÃ¡rio: vendedor (padrÃ£o), analista, gestor';
COMMENT ON FUNCTION current_profile() IS 'Retorna perfil do usuÃ¡rio autenticado - compatÃ­vel com AuthContext.tsx';
