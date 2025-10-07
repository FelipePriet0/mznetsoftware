-- Add unique constraint to applications_drafts to prevent duplicates
ALTER TABLE public.applications_drafts 
ADD CONSTRAINT applications_drafts_user_id_unique UNIQUE (user_id);