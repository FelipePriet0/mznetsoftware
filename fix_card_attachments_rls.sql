-- REMOVER TODAS AS RLS DA TABELA card_attachments
-- Igual fizemos com card_comments - deixar tudo liberado
-- 
-- Run this script in Supabase SQL Editor
-- IMPORTANTE: Execute todo este script de uma vez!

-- PASSO 1: Remover TODAS as polÃ­ticas RLS existentes
DROP POLICY IF EXISTS "Allow view attachments from accessible cards" ON public.card_attachments;
DROP POLICY IF EXISTS "Allow insert attachments for accessible cards" ON public.card_attachments;
DROP POLICY IF EXISTS "Allow update own attachments" ON public.card_attachments;
DROP POLICY IF EXISTS "Allow update attachments for authenticated users" ON public.card_attachments;
DROP POLICY IF EXISTS "Allow update attachments for same company or premium" ON public.card_attachments;
DROP POLICY IF EXISTS "Allow delete own attachments" ON public.card_attachments;
DROP POLICY IF EXISTS "Allow delete attachments for authenticated users" ON public.card_attachments;
DROP POLICY IF EXISTS "Allow delete attachments for same company or premium" ON public.card_attachments;
DROP POLICY IF EXISTS "card_attachments_update_authenticated" ON public.card_attachments;
DROP POLICY IF EXISTS "card_attachments_delete_authenticated" ON public.card_attachments;

-- PASSO 2: Criar polÃ­ticas SUPER PERMISSIVAS (igual card_comments)
-- SELECT: Todos podem ver
CREATE POLICY "card_attachments_select_all" ON public.card_attachments
FOR SELECT 
USING (true);

-- INSERT: UsuÃ¡rios autenticados podem inserir
CREATE POLICY "card_attachments_insert_authenticated" ON public.card_attachments
FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

-- UPDATE: UsuÃ¡rios autenticados podem atualizar QUALQUER anexo
CREATE POLICY "card_attachments_update_authenticated" ON public.card_attachments
FOR UPDATE 
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

-- DELETE: UsuÃ¡rios autenticados podem deletar QUALQUER anexo
CREATE POLICY "card_attachments_delete_authenticated" ON public.card_attachments
FOR DELETE 
USING (auth.role() = 'authenticated');
