-- Test script for card attachments functionality
-- Run this after applying the migrations to verify everything works

-- 1. Test if bucket exists
SELECT id, name, public FROM storage.buckets WHERE id = 'card-attachments';

-- 2. Test if table exists and has correct structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'card_attachments' 
ORDER BY ordinal_position;

-- 3. Test if triggers exist
SELECT trigger_name, event_manipulation, action_timing 
FROM information_schema.triggers 
WHERE event_object_table = 'card_attachments';

-- 4. Test if functions exist
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_name IN (
  'get_attachment_history', 
  'get_current_attachments', 
  'get_attachment_stats',
  'cleanup_orphaned_attachments',
  'create_attachment_comment',
  'create_attachment_deletion_comment'
);

-- 5. Test if RLS policies exist
SELECT policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'card_attachments';

-- 6. Test if storage policies exist
SELECT policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'objects' AND schemaname = 'storage';

-- 7. Test function with dummy data (will fail if no cards exist, but structure will be tested)
-- SELECT * FROM get_attachment_history('00000000-0000-0000-0000-000000000000'::uuid);

-- 8. Show indexes
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'card_attachments';

-- 9. Show grants
SELECT grantee, privilege_type 
FROM information_schema.role_table_grants 
WHERE table_name = 'card_attachments';

-- 10. Test comment index for attachment actions
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE indexname = 'idx_card_comments_attachment_actions';
