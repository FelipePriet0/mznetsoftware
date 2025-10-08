-- =====================================================
-- SCRIPT PARA ALTERAR RLS DE EXCLUSÃƒO DE ANEXOS
-- Permite que todos os usuÃ¡rios autenticados possam deletar anexos
-- =====================================================

-- 1. REMOVER A POLICY ATUAL DE DELETE
DROP POLICY IF EXISTS "Allow delete own attachments" ON public.card_attachments;

-- 2. CRIAR NOVA POLICY QUE PERMITE DELETE PARA TODOS OS USUÃRIOS AUTENTICADOS
CREATE POLICY "Allow delete attachments for all authenticated users" ON public.card_attachments
FOR DELETE USING (
  auth.uid() IS NOT NULL
);

-- 3. REMOVER A POLICY ATUAL DE DELETE DO STORAGE
DROP POLICY IF EXISTS "Allow delete own card attachments" ON storage.objects;

-- 4. CRIAR NOVA POLICY QUE PERMITE DELETE DO STORAGE PARA TODOS OS USUÃRIOS AUTENTICADOS
CREATE POLICY "Allow delete card attachments from storage for all authenticated users" ON storage.objects
FOR DELETE USING (
  bucket_id = 'card-attachments' AND
  auth.uid() IS NOT NULL
);

-- =====================================================
-- VERIFICAÃ‡ÃƒO
-- =====================================================
-- Para verificar se as policies foram criadas corretamente, execute:
-- SELECT schemaname, tablename, policyname, cmd, qual 
-- FROM pg_policies 
-- WHERE tablename IN ('card_attachments', 'objects') 
-- AND policyname LIKE '%delete%';

-- =====================================================
-- SCRIPT CONCLUÃDO
-- =====================================================
