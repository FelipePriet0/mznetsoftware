-- Ensure public avatars bucket exists
insert into storage.buckets (id, name, public)
values ('avatars','avatars', true)
on conflict (id) do nothing;

-- Allow public read access to avatars
do $$ begin
  if not exists (
    select 1 from pg_policy
    where polname = 'Avatar images are publicly accessible'
      and polrelid = 'storage.objects'::regclass
  ) then
    create policy "Avatar images are publicly accessible"
    on storage.objects
    for select
    using (bucket_id = 'avatars');
  end if;
end $$;

-- Allow authenticated users to upload their own avatar (path: <userId>/...)
do $$ begin
  if not exists (
    select 1 from pg_policy
    where polname = 'Users can upload their own avatar'
      and polrelid = 'storage.objects'::regclass
  ) then
    create policy "Users can upload their own avatar"
    on storage.objects
    for insert
    with check (
      bucket_id = 'avatars'
      and auth.uid()::text = (storage.foldername(name))[1]
    );
  end if;
end $$;

-- Allow authenticated users to update their own avatar (enabled)
do $$ begin
  if not exists (
    select 1 from pg_policy
    where polname = 'Users can update their own avatar'
      and polrelid = 'storage.objects'::regclass
  ) then
    create policy "Users can update their own avatar"
    on storage.objects
    for update
    using (
      bucket_id = 'avatars'
      and auth.uid()::text = (storage.foldername(name))[1]
    );
  end if;
end $$;

-- Allow authenticated users to delete their own avatar
do $$ begin
  if not exists (
    select 1 from pg_policy
    where polname = 'Users can delete their own avatar'
      and polrelid = 'storage.objects'::regclass
  ) then
    create policy "Users can delete their own avatar"
    on storage.objects
    for delete
    using (
      bucket_id = 'avatars'
      and auth.uid()::text = (storage.foldername(name))[1]
    );
  end if;
end $$;

-- Create trigger to auto-create profiles on new users
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created'
  ) THEN
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW
      EXECUTE FUNCTION public.handle_new_user();
  END IF;
END $$;

-- Backfill missing profiles for existing users
insert into public.profiles (id, full_name, role, company_id)
select u.id,
       coalesce(u.raw_user_meta_data->>'full_name',''),
       'comercial'::public.user_role,
       null
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null;
