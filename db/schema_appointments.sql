-- Create customers table
create table if not exists customers (
  id uuid default uuid_generate_v4() primary key,
  tenant_id uuid references tenants(id) not null,
  name text not null,
  phone text,
  email text,
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create appointments table
create table if not exists appointments (
  id uuid default uuid_generate_v4() primary key,
  tenant_id uuid references tenants(id) not null,
  customer_id uuid references customers(id),
  service_id uuid references services(id), -- Primary service (for legacy/simple view)
  staff_id uuid references staff(id), -- Changed from profiles(id) to staff(id) based on NewAppointmentModal usage
  start_time timestamp with time zone not null,
  end_time timestamp with time zone not null,
  status text default 'scheduled' check (status in ('scheduled', 'confirmed', 'completed', 'cancelled', 'no_show', 'blocked')),
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create appointment_items table (for multiple services per appointment)
create table if not exists appointment_items (
  id uuid default uuid_generate_v4() primary key,
  appointment_id uuid references appointments(id) on delete cascade not null,
  service_id uuid references services(id) not null,
  price decimal(10,2) default 0,
  duration integer default 0, -- minutes
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create staff_services table (junction table for staff skills)
create table if not exists staff_services (
  id uuid default uuid_generate_v4() primary key,
  staff_id uuid references staff(id) on delete cascade not null,
  service_id uuid references services(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(staff_id, service_id)
);

-- Enable RLS
alter table customers enable row level security;
alter table appointments enable row level security;
alter table appointment_items enable row level security;
alter table staff_services enable row level security;

-- Create RLS policies for customers
create policy "Users can view customers in their tenant"
  on customers for select
  using (tenant_id = (select tenant_id from profiles where id = auth.uid()));

create policy "Users can insert customers in their tenant"
  on customers for insert
  with check (tenant_id = (select tenant_id from profiles where id = auth.uid()));

create policy "Users can update customers in their tenant"
  on customers for update
  using (tenant_id = (select tenant_id from profiles where id = auth.uid()));

create policy "Users can delete customers in their tenant"
  on customers for delete
  using (tenant_id = (select tenant_id from profiles where id = auth.uid()));

-- Create RLS policies for appointments
create policy "Users can view appointments in their tenant"
  on appointments for select
  using (tenant_id = (select tenant_id from profiles where id = auth.uid()));

create policy "Users can insert appointments in their tenant"
  on appointments for insert
  with check (tenant_id = (select tenant_id from profiles where id = auth.uid()));

create policy "Users can update appointments in their tenant"
  on appointments for update
  using (tenant_id = (select tenant_id from profiles where id = auth.uid()));

create policy "Users can delete appointments in their tenant"
  on appointments for delete
  using (tenant_id = (select tenant_id from profiles where id = auth.uid()));

-- Create RLS policies for appointment_items
create policy "Users can view appointment_items in their tenant"
  on appointment_items for select
  using (appointment_id in (select id from appointments where tenant_id = (select tenant_id from profiles where id = auth.uid())));

create policy "Users can insert appointment_items in their tenant"
  on appointment_items for insert
  with check (appointment_id in (select id from appointments where tenant_id = (select tenant_id from profiles where id = auth.uid())));

-- Create RLS policies for staff_services
create policy "Users can view staff_services in their tenant"
  on staff_services for select
  using (staff_id in (select id from staff where tenant_id = (select tenant_id from profiles where id = auth.uid())));

create policy "Users can insert staff_services in their tenant"
  on staff_services for insert
  with check (staff_id in (select id from staff where tenant_id = (select tenant_id from profiles where id = auth.uid())));
