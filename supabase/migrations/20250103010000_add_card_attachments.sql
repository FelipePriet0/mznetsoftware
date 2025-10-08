-- Create card_attachments table for file attachments in Kanban cards
CREATE TABLE IF NOT EXISTS public.card_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id uuid NOT NULL REFERENCES public.kanban_cards(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES public.profiles(id),
  author_name text NOT NULL,
  author_role text,
  file_name text NOT NULL,
  file_path text NOT NULL, -- Path in Supabase Storage
  file_size bigint NOT NULL, -- Size in bytes
  file_type text NOT NULL, -- MIME type
  file_extension text NOT NULL, -- e.g., 'pdf', 'jpg', 'png'
  description text, -- Optional description of the attachment
  comment_id uuid, -- Optional: link to specific comment/parecer
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_card_attachments_card_id ON public.card_attachments (card_id);
CREATE INDEX IF NOT EXISTS idx_card_attachments_author_id ON public.card_attachments (author_id);
CREATE INDEX IF NOT EXISTS idx_card_attachments_created_at ON public.card_attachments (created_at);
CREATE INDEX IF NOT EXISTS idx_card_attachments_comment_id ON public.card_attachments (comment_id);

-- Add trigger to update updated_at
CREATE OR REPLACE FUNCTION public.set_timestamp_card_attachments()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_timestamp_card_attachments
  BEFORE UPDATE ON public.card_attachments
  FOR EACH ROW
  EXECUTE FUNCTION public.set_timestamp_card_attachments();

-- RLS Policies for card_attachments
ALTER TABLE public.card_attachments ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view attachments from cards they can access
CREATE POLICY "Allow view attachments from accessible cards" ON public.card_attachments
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.kanban_cards kc
    WHERE kc.id = card_attachments.card_id
    AND (
      public.same_company(kc.company_id) OR public.is_premium()
    )
  )
);

-- Allow authenticated users to insert attachments for cards they can access
CREATE POLICY "Allow insert attachments for accessible cards" ON public.card_attachments
FOR INSERT WITH CHECK (
  author_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM public.kanban_cards kc
    WHERE kc.id = card_attachments.card_id
    AND (
      public.same_company(kc.company_id) OR public.is_premium()
    )
  )
);

-- Allow users to update only their own attachments
CREATE POLICY "Allow update own attachments" ON public.card_attachments
FOR UPDATE USING (
  author_id = auth.uid()
) WITH CHECK (
  author_id = auth.uid()
);

-- Allow users to delete only their own attachments
CREATE POLICY "Allow delete own attachments" ON public.card_attachments
FOR DELETE USING (
  author_id = auth.uid()
);

-- Grant permissions
GRANT ALL ON public.card_attachments TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;
