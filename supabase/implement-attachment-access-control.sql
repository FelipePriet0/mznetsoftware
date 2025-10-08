-- ===================================================
-- SISTEMA DE CONTROLE DE ACESSO PARA ANEXOS
-- ===================================================

-- 1. ATUALIZAR POLÃTICAS RLS PARA CARD_ATTACHMENTS
-- ===================================================

-- Remover polÃ­ticas antigas (muito permissivas)
DROP POLICY IF EXISTS "Allow view attachments from accessible cards" ON public.card_attachments;
DROP POLICY IF EXISTS "Allow insert attachments for accessible cards" ON public.card_attachments;
DROP POLICY IF EXISTS "Allow update own attachments" ON public.card_attachments;
DROP POLICY IF EXISTS "Allow delete own attachments" ON public.card_attachments;

-- Criar novas polÃ­ticas baseadas em roles e empresas
-- Visualizar anexos: mesmos critÃ©rios dos cards (mesma empresa ou premium)
CREATE POLICY "View attachments same company or premium" ON public.card_attachments
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.kanban_cards kc
    WHERE kc.id = card_attachments.card_id
    AND (
      -- Premium pode ver tudo
      public.is_premium()
      OR
      -- Mesma empresa
      public.same_company(kc.company_id)
      OR
      -- Autor pode ver seus prÃ³prios anexos
      author_id = auth.uid()
    )
  )
);

-- Inserir anexos: apenas para cards da mesma empresa ou premium
CREATE POLICY "Insert attachments same company or premium" ON public.card_attachments
FOR INSERT WITH CHECK (
  author_id = auth.uid() AND
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM public.kanban_cards kc
    WHERE kc.id = card_id
    AND (
      public.is_premium()
      OR
      public.same_company(kc.company_id)
    )
  )
);

-- Atualizar anexos: apenas prÃ³prios anexos
CREATE POLICY "Update own attachments" ON public.card_attachments
FOR UPDATE USING (
  author_id = auth.uid()
) WITH CHECK (
  author_id = auth.uid()
);

-- Deletar anexos: apenas prÃ³prios anexos ou premium
CREATE POLICY "Delete own attachments or premium" ON public.card_attachments
FOR DELETE USING (
  author_id = auth.uid() OR public.is_premium()
);

-- ===================================================
-- 2. ATUALIZAR POLÃTICAS RLS PARA STORAGE
-- ===================================================

-- Remover polÃ­ticas antigas do storage
DROP POLICY IF EXISTS "Allow view card attachments from accessible cards" ON storage.objects;
DROP POLICY IF EXISTS "Allow upload card attachments for accessible cards" ON storage.objects;
DROP POLICY IF EXISTS "Allow update own card attachments" ON storage.objects;
DROP POLICY IF EXISTS "Allow delete own card attachments" ON storage.objects;

-- Visualizar arquivos: mesmos critÃ©rios dos anexos
CREATE POLICY "View card attachments same company or premium" ON storage.objects
FOR SELECT USING (
  bucket_id = 'card-attachments' AND
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM public.card_attachments ca
    JOIN public.kanban_cards kc ON kc.id = ca.card_id
    WHERE ca.file_path = name
    AND (
      -- Premium pode ver tudo
      public.is_premium()
      OR
      -- Mesma empresa
      public.same_company(kc.company_id)
      OR
      -- Autor pode ver seus prÃ³prios anexos
      ca.author_id = auth.uid()
    )
  )
);

-- Upload de arquivos: apenas para cards da mesma empresa ou premium
CREATE POLICY "Upload card attachments same company or premium" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'card-attachments' AND
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM public.kanban_cards kc
    WHERE kc.id = (
      SELECT ca.card_id FROM public.card_attachments ca 
      WHERE ca.file_path = name 
      LIMIT 1
    )
    AND (
      public.is_premium()
      OR
      public.same_company(kc.company_id)
    )
  )
);

-- Atualizar arquivos: apenas prÃ³prios arquivos
CREATE POLICY "Update own card attachments" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'card-attachments' AND
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM public.card_attachments ca
    WHERE ca.file_path = name
    AND ca.author_id = auth.uid()
  )
);

-- Deletar arquivos: apenas prÃ³prios arquivos ou premium
CREATE POLICY "Delete own card attachments or premium" ON storage.objects
FOR DELETE USING (
  bucket_id = 'card-attachments' AND
  auth.uid() IS NOT NULL AND
  (
    EXISTS (
      SELECT 1 FROM public.card_attachments ca
      WHERE ca.file_path = name
      AND ca.author_id = auth.uid()
    )
    OR
    public.is_premium()
  )
);

-- ===================================================
-- 3. CRIAR FUNÃ‡ÃƒO PARA VERIFICAR PERMISSÃ•ES DE ANEXO
-- ===================================================

CREATE OR REPLACE FUNCTION public.can_access_attachment(attachment_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.card_attachments ca
    JOIN public.kanban_cards kc ON kc.id = ca.card_id
    WHERE ca.id = attachment_id
    AND (
      -- Premium pode acessar tudo
      public.is_premium()
      OR
      -- Mesma empresa
      public.same_company(kc.company_id)
      OR
      -- Autor pode acessar seus prÃ³prios anexos
      ca.author_id = auth.uid()
    )
  );
$$;

-- ===================================================
-- 4. CRIAR FUNÃ‡ÃƒO PARA VERIFICAR PERMISSÃ•ES DE UPLOAD
-- ===================================================

CREATE OR REPLACE FUNCTION public.can_upload_attachment(card_id_param uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.kanban_cards kc
    WHERE kc.id = card_id_param
    AND (
      -- Premium pode fazer upload em qualquer card
      public.is_premium()
      OR
      -- Mesma empresa
      public.same_company(kc.company_id)
    )
  );
$$;

-- ===================================================
-- 5. CRIAR FUNÃ‡ÃƒO PARA VERIFICAR PERMISSÃ•ES DE DOWNLOAD
-- ===================================================

CREATE OR REPLACE FUNCTION public.can_download_attachment(file_path_param text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.card_attachments ca
    JOIN public.kanban_cards kc ON kc.id = ca.card_id
    WHERE ca.file_path = file_path_param
    AND (
      -- Premium pode baixar tudo
      public.is_premium()
      OR
      -- Mesma empresa
      public.same_company(kc.company_id)
      OR
      -- Autor pode baixar seus prÃ³prios anexos
      ca.author_id = auth.uid()
    )
  );
$$;

-- ===================================================
-- 6. GRANT PERMISSÃ•ES PARA AS NOVAS FUNÃ‡Ã•ES
-- ===================================================

GRANT EXECUTE ON FUNCTION public.can_access_attachment(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_upload_attachment(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_download_attachment(text) TO authenticated;

-- ===================================================
-- CONCLUÃDO
-- ===================================================
