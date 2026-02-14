-- Create service_categories table
create table if not exists public.service_categories (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid references public.tenants(id) on delete cascade not null,
  name text not null,
  created_at timestamptz default now()
);

alter table public.service_categories enable row level security;

drop policy if exists "Tenant isolation for service_categories" on public.service_categories;
create policy "Tenant isolation for service_categories"
  on public.service_categories for all
  using (tenant_id in (
    select tenant_id from public.profiles where id = auth.uid()
  ));

-- Add category_id to services
alter table public.services add column if not exists category_id uuid references public.service_categories(id) on delete set null;

-- Create appointment_items table
create table if not exists public.appointment_items (
  id uuid primary key default uuid_generate_v4(),
  appointment_id uuid references public.appointments(id) on delete cascade not null,
  service_id uuid references public.services(id) on delete restrict not null,
  price decimal(10, 2) not null, -- Snapshot price
  duration integer not null, -- Snapshot duration
  created_at timestamptz default now()
);

alter table public.appointment_items enable row level security;

drop policy if exists "Tenant isolation for appointment_items" on public.appointment_items;
create policy "Tenant isolation for appointment_items"
  on public.appointment_items for all
  using (appointment_id in (
    select id from public.appointments where tenant_id in (
      select tenant_id from public.profiles where id = auth.uid()
    )
  ));

-- Make appointments.service_id nullable
alter table public.appointments alter column service_id drop not null;
