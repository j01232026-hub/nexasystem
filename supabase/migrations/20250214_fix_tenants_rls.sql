-- Fix permissions for the 'tenants' table to allow updates
-- Run this in Supabase Dashboard -> SQL Editor

-- 1. Enable RLS on tenants table (if not already enabled)
alter table tenants enable row level security;

-- 2. Drop existing policies to avoid conflicts
drop policy if exists "Users can update their own tenant" on tenants;
drop policy if exists "Users can view their own tenant" on tenants;

-- 3. Create Policy to allow users to VIEW their own tenant
create policy "Users can view their own tenant"
on tenants for select
to authenticated
using (
  id in (
    select tenant_id from profiles where id = auth.uid()
  )
);

-- 4. Create Policy to allow users to UPDATE their own tenant
create policy "Users can update their own tenant"
on tenants for update
to authenticated
using (
  id in (
    select tenant_id from profiles where id = auth.uid()
  )
);

-- 5. Grant permissions just in case
grant all on tenants to authenticated;
grant all on profiles to authenticated;
