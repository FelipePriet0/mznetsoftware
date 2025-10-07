-- CORRIGIR PERMISSÕES DE DOWNLOAD PARA ANEXOS
-- Este script ajusta as políticas RLS para permitir download público dos anexos

-- 1. REMOVER POLÍTICAS RESTRITIVAS EXISTENTES
DROP POLICY IF EXISTS "Allow view card attachments from accessible cards" ON storage.objects;
DROP POLICY IF EXISTS "Allow upload card attachments for accessible cards" ON storage.objects;
DROP POLICY IF EXISTS "Allow update own card attachments" ON storage.objects;
DROP POLICY IF EXISTS "Allow delete own card attachments" ON storage.objects;

-- 2. CRIAR POLÍTICAS MAIS PERMISSIVAS PARA DOWNLOAD
-- Permitir visualização pública de anexos (para download)
CREATE POLICY "Allow public view of card attachments" ON storage.objects
FOR SELECT USING (
  bucket_id = 'card-attachments'
);

-- Permitir upload apenas para usuários autenticados
CREATE POLICY "Allow authenticated upload of card attachments" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'card-attachments' AND
  auth.uid() IS NOT NULL
);

-- Permitir atualização apenas dos próprios arquivos
CREATE POLICY "Allow update own card attachments" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'card-attachments' AND
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM public.card_attachments ca
    WHERE ca.file_path = name
    AND ca.author_id = auth.uid()
  )
) WITH CHECK (
  bucket_id = 'card-attachments' AND
  auth.uid() IS NOT NULL
);

-- Permitir deleção apenas dos próprios arquivos
CREATE POLICY "Allow delete own card attachments" ON storage.objects
FOR DELETE USING (
  bucket_id = 'card-attachments' AND
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM public.card_attachments ca
    WHERE ca.file_path = name
    AND ca.author_id = auth.uid()
  )
);

-- 3. VERIFICAR SE O BUCKET ESTÁ CONFIGURADO COMO PÚBLICO
UPDATE storage.buckets 
SET public = true 
WHERE id = 'card-attachments';

-- 4. COMENTÁRIO INFORMATIVO
-- Agora os anexos podem ser baixados publicamente via URL direta
-- mas apenas usuários autenticados podem fazer upload/update/delete
