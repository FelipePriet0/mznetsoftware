-- Fix RLS policy for card_attachments to allow gestor role to update/delete attachments
-- within their company, not just their own attachments

-- Drop the existing restrictive update policy
DROP POLICY IF EXISTS "Allow update own attachments" ON public.card_attachments;

-- Create a new update policy that allows users to update attachments within their company
-- or if they are premium users
CREATE POLICY "Allow update attachments for same company or premium" ON public.card_attachments
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.kanban_cards kc
    WHERE kc.id = card_attachments.card_id
    AND (
      public.same_company(kc.company_id) OR public.is_premium()
    )
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.kanban_cards kc
    WHERE kc.id = card_attachments.card_id
    AND (
      public.same_company(kc.company_id) OR public.is_premium()
    )
  )
);

-- Drop the existing restrictive delete policy
DROP POLICY IF EXISTS "Allow delete own attachments" ON public.card_attachments;

-- Create a new delete policy that allows users to delete attachments within their company
-- or if they are premium users
CREATE POLICY "Allow delete attachments for same company or premium" ON public.card_attachments
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.kanban_cards kc
    WHERE kc.id = card_attachments.card_id
    AND (
      public.same_company(kc.company_id) OR public.is_premium()
    )
  )
);
