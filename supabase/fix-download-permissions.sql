-- CORRIGIR PERMISSÃ•ES DE DOWNLOAD PARA ANEXOS
-- Este script ajusta as polÃ­ticas RLS para permitir download pÃºblico dos anexos

-- 1. REMOVER POLÃTICAS RESTRITIVAS EXISTENTES
DROP POLICY IF EXISTS "Allow view card attachments from accessible cards" ON storage.objects;
DROP POLICY IF EXISTS "Allow upload card attachments for accessible cards" ON storage.objects;
DROP POLICY IF EXISTS "Allow update own card attachments" ON storage.objects;
DROP POLICY IF EXISTS "Allow delete own card attachments" ON storage.objects;

-- 2. CRIAR POLÃTICAS MAIS PERMISSIVAS PARA DOWNLOAD
-- Permitir visualizaÃ§Ã£o pÃºblica de anexos (para download)
CREATE POLICY "Allow public view of card attachments" ON storage.objects
FOR SELECT USING (
  bucket_id = 'card-attachments'
);

-- Permitir upload apenas para usuÃ¡rios autenticados
CREATE POLICY "Allow authenticated upload of card attachments" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'card-attachments' AND
  auth.uid() IS NOT NULL
);

-- Permitir atualizaÃ§Ã£o apenas dos prÃ³prios arquivos
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

-- Permitir deleÃ§Ã£o apenas dos prÃ³prios arquivos
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

-- 3. VERIFICAR SE O BUCKET ESTÃ CONFIGURADO COMO PÃšBLICO
UPDATE storage.buckets 
SET public = true 
WHERE id = 'card-attachments';

-- 4. COMENTÃRIO INFORMATIVO
-- Agora os anexos podem ser baixados publicamente via URL direta
-- mas apenas usuÃ¡rios autenticados podem fazer upload/update/delete
