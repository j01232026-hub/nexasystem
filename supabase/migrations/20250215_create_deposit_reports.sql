
-- Create deposit_reports table
create table if not exists deposit_reports (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  appointment_id uuid references appointments(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  tenant_id uuid references tenants(id) on delete cascade not null,
  report_method text not null check (report_method in ('transfer', 'linepay')),
  transfer_last_5 text,
  status text default 'pending_confirmation' check (status in ('pending_confirmation', 'confirmed', 'rejected'))
);

-- Enable RLS
alter table deposit_reports enable row level security;

-- Policies

-- 1. Users can insert their own reports
create policy "Users can insert their own reports"
  on deposit_reports for insert
  to authenticated
  with check (
    auth.uid() = user_id
  );

-- 2. Users can view their own reports
create policy "Users can view their own reports"
  on deposit_reports for select
  to authenticated
  using (
    auth.uid() = user_id
  );

-- 3. Tenants (Staff/Owners) can view reports for their tenant
create policy "Tenants can view reports for their tenant"
  on deposit_reports for select
  to authenticated
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and profiles.tenant_id = deposit_reports.tenant_id
      and profiles.role in ('owner', 'admin', 'stylist', 'assistant')
    )
  );

-- 4. Tenants (Staff/Owners) can update status
create policy "Tenants can update reports for their tenant"
  on deposit_reports for update
  to authenticated
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and profiles.tenant_id = deposit_reports.tenant_id
      and profiles.role in ('owner', 'admin', 'stylist', 'assistant')
    )
  );

-- Add indexes for performance
create index deposit_reports_appointment_id_idx on deposit_reports(appointment_id);
create index deposit_reports_tenant_id_status_idx on deposit_reports(tenant_id, status);
