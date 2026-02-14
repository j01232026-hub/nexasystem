
-- 1. Create the bucket if it doesn't exist (this is idempotent-ish in logic, but SQL requires checks. We'll assume it exists or create it via API if needed, but here we focus on policies)
insert into storage.buckets (id, name, public)
values ('store-assets', 'store-assets', true)
on conflict (id) do nothing;

-- 2. Enable RLS (should be on by default, but good to ensure)
alter table storage.objects enable row level security;

-- 3. Drop existing policies to avoid conflicts and ensure clean state
drop policy if exists "Authenticated users can upload store assets" on storage.objects;
drop policy if exists "Public can view store assets" on storage.objects;
drop policy if exists "Authenticated users can update store assets" on storage.objects;
drop policy if exists "Authenticated users can delete store assets" on storage.objects;

-- 4. Create comprehensive policies

-- Allow authenticated users to INSERT files into 'store-assets' bucket
create policy "Authenticated users can upload store assets"
on storage.objects for insert
to authenticated
with check ( bucket_id = 'store-assets' );

-- Allow everyone (public) to SELECT (view) files in 'store-assets' bucket
create policy "Public can view store assets"
on storage.objects for select
to public
using ( bucket_id = 'store-assets' );

-- Allow authenticated users to UPDATE their own files (or all files in this bucket for simplicity in this MVP)
create policy "Authenticated users can update store assets"
on storage.objects for update
to authenticated
using ( bucket_id = 'store-assets' );

-- Allow authenticated users to DELETE files
create policy "Authenticated users can delete store assets"
on storage.objects for delete
to authenticated
using ( bucket_id = 'store-assets' );
