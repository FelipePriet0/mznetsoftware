-- Create card-attachments storage bucket and policies
-- This migration creates the Supabase Storage bucket for card attachments

-- 1. Create the card-attachments bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('card-attachments', 'card-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- 2. RLS Policies for card-attachments bucket

-- Allow authenticated users to view attachments from cards they can access
CREATE POLICY "Allow view card attachments from accessible cards" ON storage.objects
FOR SELECT USING (
  bucket_id = 'card-attachments' AND
  EXISTS (
    SELECT 1 FROM public.card_attachments ca
    JOIN public.kanban_cards kc ON kc.id = ca.card_id
    WHERE ca.file_path = name
    AND (
      public.same_company(kc.company_id) OR public.is_premium()
    )
  )
);

-- Allow authenticated users to upload attachments for cards they can access
CREATE POLICY "Allow upload card attachments for accessible cards" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'card-attachments' AND
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM public.kanban_cards kc
    WHERE kc.id::text = (storage.foldername(name))[1]
    AND (
      public.same_company(kc.company_id) OR public.is_premium()
    )
  )
);

-- Allow users to update only their own attachments
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

-- Allow users to delete only their own attachments
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

-- 3. Function to automatically create comment when attachment is uploaded
CREATE OR REPLACE FUNCTION public.create_attachment_comment()
RETURNS TRIGGER AS $$
DECLARE
  card_info RECORD;
  comment_content TEXT;
BEGIN
  -- Get card information
  SELECT 
    kc.id as card_id,
    kc.title,
    kc.person_type,
    kc.area
  INTO card_info
  FROM public.kanban_cards kc
  WHERE kc.id = NEW.card_id;

  -- Create comment content
  comment_content := format(
    '📎 Anexo adicionado: %s',
    NEW.file_name
  );
  
  -- Add description if provided
  IF NEW.description IS NOT NULL AND NEW.description != '' THEN
    comment_content := comment_content || format(
      E'\n\n📝 Descrição: %s',
      NEW.description
    );
  END IF;

  -- Add file details
  comment_content := comment_content || format(
    E'\n\n📊 Detalhes do arquivo:' ||
    E'\n• Tipo: %s' ||
    E'\n• Tamanho: %s bytes' ||
    E'\n• Extensão: %s' ||
    E'\n• Autor: %s (%s)',
    NEW.file_type,
    NEW.file_size,
    NEW.file_extension,
    NEW.author_name,
    NEW.author_role
  );

  -- Insert comment into card_comments
  INSERT INTO public.card_comments (
    card_id,
    author_id,
    author_name,
    author_role,
    content,
    level
  ) VALUES (
    NEW.card_id,
    NEW.author_id,
    NEW.author_name,
    NEW.author_role,
    comment_content,
    0 -- Main comment level
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Trigger to automatically create comment when attachment is uploaded
CREATE TRIGGER trg_create_attachment_comment
  AFTER INSERT ON public.card_attachments
  FOR EACH ROW
  EXECUTE FUNCTION public.create_attachment_comment();

-- 5. Function to create comment when attachment is deleted
CREATE OR REPLACE FUNCTION public.create_attachment_deletion_comment()
RETURNS TRIGGER AS $$
DECLARE
  comment_content TEXT;
BEGIN
  -- Create deletion comment content
  comment_content := format(
    '🗑️ Anexo removido: %s',
    OLD.file_name
  );

  -- Add file details for reference
  comment_content := comment_content || format(
    E'\n\n📊 Detalhes do arquivo removido:' ||
    E'\n• Tipo: %s' ||
    E'\n• Tamanho: %s bytes' ||
    E'\n• Extensão: %s' ||
    E'\n• Removido por: %s (%s)',
    OLD.file_type,
    OLD.file_size,
    OLD.file_extension,
    OLD.author_name,
    OLD.author_role
  );

  -- Insert deletion comment into card_comments
  INSERT INTO public.card_comments (
    card_id,
    author_id,
    author_name,
    author_role,
    content,
    level
  ) VALUES (
    OLD.card_id,
    OLD.author_id,
    OLD.author_name,
    OLD.author_role,
    comment_content,
    0 -- Main comment level
  );

  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- 6. Trigger to automatically create comment when attachment is deleted
CREATE TRIGGER trg_create_attachment_deletion_comment
  AFTER DELETE ON public.card_attachments
  FOR EACH ROW
  EXECUTE FUNCTION public.create_attachment_deletion_comment();
