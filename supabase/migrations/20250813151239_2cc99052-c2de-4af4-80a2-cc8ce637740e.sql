-- Remove default before changing enum
ALTER TABLE profiles ALTER COLUMN role DROP DEFAULT;

-- Remove analista_senior role from the enum, keeping only the necessary roles
-- analista_premium = analista sênior (same functionality)
ALTER TYPE user_role RENAME TO user_role_old;

CREATE TYPE user_role AS ENUM ('analista_premium', 'reanalista', 'comercial');

-- Update profiles table to use new enum
ALTER TABLE profiles 
  ALTER COLUMN role TYPE user_role 
  USING CASE 
    WHEN role::text = 'analista_senior' THEN 'analista_premium'::user_role
    ELSE role::text::user_role
  END;

-- Set new default
ALTER TABLE profiles ALTER COLUMN role SET DEFAULT 'comercial'::user_role;

-- Drop old enum
DROP TYPE user_role_old;