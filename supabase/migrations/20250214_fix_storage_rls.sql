
-- 1. Create the bucket if it doesn't exist
insert into storage.buckets (id, name, public)
values ('store-assets', 'store-assets', true)
on conflict (id) do nothing;

-- 2. Drop existing policies to avoid conflicts
-- We use a DO block to ignore errors if policies don't exist, 
-- or we just execute drop statements that might fail if we don't own them.
-- However, standard drop if exists is usually fine in Supabase SQL Editor.
-- The error "must be owner of table objects" usually comes from "alter table".
-- We SKIP 'alter table storage.objects enable row level security' as it requires ownership.

drop policy if exists "Authenticated users can upload store assets" on storage.objects;
drop policy if exists "Public can view store assets" on storage.objects;
drop policy if exists "Authenticated users can update store assets" on storage.objects;
drop policy if exists "Authenticated users can delete store assets" on storage.objects;

-- 3. Create policies
create policy "Authenticated users can upload store assets"
on storage.objects for insert
to authenticated
with check ( bucket_id = 'store-assets' );

create policy "Public can view store assets"
on storage.objects for select
to public
using ( bucket_id = 'store-assets' );

create policy "Authenticated users can update store assets"
on storage.objects for update
to authenticated
using ( bucket_id = 'store-assets' );

create policy "Authenticated users can delete store assets"
on storage.objects for delete
to authenticated
using ( bucket_id = 'store-assets' );
