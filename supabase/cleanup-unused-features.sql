-- =====================================================
-- LIMPEZA DE FUNCIONALIDADES NÃƒO USADAS
-- Execute este script no Supabase SQL Editor
-- =====================================================

-- ========================================
-- 1. REMOVER SISTEMA DE RASCUNHOS (Desativado)
-- ========================================

-- Verificar se a tabela existe antes de tentar dropar
DO $$ 
BEGIN
  -- Dropar trigger se existir
  IF EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_applications_drafts_updated_at'
  ) THEN
    DROP TRIGGER update_applications_drafts_updated_at ON applications_drafts;
  END IF;
  
  -- Dropar tabela se existir
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'applications_drafts'
  ) THEN
    DROP TABLE applications_drafts CASCADE;
  END IF;
END $$;

-- Dropar function save_draft se existir
DROP FUNCTION IF EXISTS save_draft(jsonb);

-- ========================================
-- 2. REMOVER CAMPOS DE EMPRESA (NÃ£o usado)
-- ========================================

-- Nota: company_id pode estar em uso em outras tabelas
-- Verificar antes de remover completamente
-- Por ora, vamos documentar mas nÃ£o remover

-- ========================================
-- 3. REMOVER CAMPO SCORE (NÃ£o usado)
-- ========================================

-- Score nÃ£o estÃ¡ no banco (sÃ³ na interface TypeScript)
-- NÃ£o precisa SQL, sÃ³ remover do cÃ³digo

-- ========================================
-- 4. REMOVER CHECKS (NÃ£o usado)
-- ========================================

-- Checks nÃ£o estÃ£o no banco (sÃ³ na interface TypeScript)
-- NÃ£o precisa SQL, sÃ³ remover do cÃ³digo

-- ========================================
-- 5. VERIFICAR RESULTADO
-- ========================================

-- Ver se applications_drafts foi removida
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name = 'applications_drafts';
-- Deve retornar 0 linhas

-- Ver functions relacionadas a draft
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name LIKE '%draft%';
-- Deve retornar 0 linhas

-- âœ… LIMPEZA CONCLUÃDA!

