-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- -----------------------------------------------------------------------------
-- RESET (Dev Only: Drop tables to ensure clean slate)
-- 警告：這會刪除所有數據！
-- -----------------------------------------------------------------------------
drop table if exists public.appointment_items cascade;
drop table if exists public.staff_services cascade;
drop table if exists public.appointments cascade;
drop table if exists public.staff cascade;
drop table if exists public.customers cascade;
drop table if exists public.services cascade;
drop table if exists public.service_categories cascade;
drop table if exists public.profiles cascade;
drop table if exists public.tenants cascade;

-- -----------------------------------------------------------------------------
-- 1. Tenants (商戶/租戶)
-- 核心表：所有其他數據都必須關聯到此表
-- -----------------------------------------------------------------------------
create table public.tenants (
    id uuid primary key default uuid_generate_v4(),
    name text not null,
    slug text unique not null, -- 用於子域名或 URL，如 'glow-taipei'
    plan_type text check (plan_type in ('lite', 'pro', 'enterprise')) default 'lite',
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- RLS: Only internal admins or system roles can create tenants initially
alter table public.tenants enable row level security;

-- -----------------------------------------------------------------------------
-- 2. Profiles (用戶資料 - 系統登入帳號)
-- 擴展 Supabase Auth，關聯到具體的 Tenant
-- -----------------------------------------------------------------------------
create table public.profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    tenant_id uuid references public.tenants(id) on delete cascade not null,
    role text check (role in ('owner', 'manager', 'staff')) default 'staff',
    full_name text,
    phone text,
    avatar_url text,
    is_active boolean default true,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "Users can insert their own profile"
    on public.profiles for insert
    to authenticated
    with check (auth.uid() = id);

-- Policy: Users can view profiles in same tenant
create policy "Users can view profiles in same tenant"
    on public.profiles for select
    using (tenant_id in (
        select tenant_id from public.profiles where id = auth.uid()
    ));

-- -----------------------------------------------------------------------------
-- 2.1 Staff (員工/美容師 - 業務實體)
-- 這是「被預約」的對象。可以關聯到 Profile (如果有登入權限)，也可以獨立存在 (Ghost User)。
-- -----------------------------------------------------------------------------
create table public.staff (
    id uuid primary key default uuid_generate_v4(),
    tenant_id uuid references public.tenants(id) on delete cascade not null,
    full_name text not null,
    display_name text, -- 用於 C 端顯示 (如: "Amy 老師")
    role text default 'stylist', -- stylist, assistant, manager
    bio text, -- 個人簡介
    avatar_url text,
    user_id uuid references auth.users(id) on delete set null, -- 關聯的系統帳號 (可選)
    is_active boolean default true,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

alter table public.staff enable row level security;

create policy "Tenant isolation for staff"
    on public.staff for all
    using (tenant_id in (
        select tenant_id from public.profiles where id = auth.uid()
    ));

-- -----------------------------------------------------------------------------
-- 3. Service Categories (服務分類)
-- -----------------------------------------------------------------------------
create table public.service_categories (
    id uuid primary key default uuid_generate_v4(),
    tenant_id uuid references public.tenants(id) on delete cascade not null,
    name text not null,
    created_at timestamptz default now()
);

alter table public.service_categories enable row level security;

create policy "Tenant isolation for service_categories"
    on public.service_categories for all
    using (tenant_id in (
        select tenant_id from public.profiles where id = auth.uid()
    ));

-- -----------------------------------------------------------------------------
-- 3.1 Services (服務項目)
-- -----------------------------------------------------------------------------
create table public.services (
    id uuid primary key default uuid_generate_v4(),
    tenant_id uuid references public.tenants(id) on delete cascade not null,
    category_id uuid references public.service_categories(id) on delete set null,
    name text not null,
    description text,
    duration integer not null, -- 分鐘
    price decimal(10, 2) not null,
    category text, -- Deprecated, use category_id
    is_active boolean default true,
    created_at timestamptz default now()
);

alter table public.services enable row level security;

-- Policy: Tenant Isolation
create policy "Tenant isolation for services"
    on public.services for all
    using (tenant_id in (
        select tenant_id from public.profiles where id = auth.uid()
    ));

-- -----------------------------------------------------------------------------
-- 3.1 Staff Services (員工技能關聯表)
-- 決定哪位員工可以執行哪項服務
-- -----------------------------------------------------------------------------
create table public.staff_services (
    staff_id uuid references public.staff(id) on delete cascade,
    service_id uuid references public.services(id) on delete cascade,
    created_at timestamptz default now(),
    primary key (staff_id, service_id)
);

alter table public.staff_services enable row level security;

create policy "Tenant isolation for staff_services"
    on public.staff_services for all
    using (staff_id in (
        select id from public.staff where tenant_id in (
            select tenant_id from public.profiles where id = auth.uid()
        )
    ));

-- -----------------------------------------------------------------------------
-- 4. Customers (客戶 CRM)
-- 包含 LINE ID 用於 C 端整合
-- -----------------------------------------------------------------------------
create table public.customers (
    id uuid primary key default uuid_generate_v4(),
    tenant_id uuid references public.tenants(id) on delete cascade not null,
    name text not null,
    phone text,
    line_user_id text, -- LINE User ID (Unique per provider, safe to store)
    line_display_name text,
    line_picture_url text,
    notes text,
    tags text[], -- PostgreSQL Array: ['VIP', 'Sensitive']
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

alter table public.customers enable row level security;

create policy "Tenant isolation for customers"
    on public.customers for all
    using (tenant_id in (
        select tenant_id from public.profiles where id = auth.uid()
    ));

-- -----------------------------------------------------------------------------
-- 5. Appointments (預約)
-- 核心業務表，包含 Google Calendar Sync 欄位
-- -----------------------------------------------------------------------------
create table public.appointments (
    id uuid primary key default uuid_generate_v4(),
    tenant_id uuid references public.tenants(id) on delete cascade not null,
    customer_id uuid references public.customers(id) on delete cascade,
    staff_id uuid references public.staff(id) on delete set null, -- 修改關聯至 staff 表
    service_id uuid references public.services(id) on delete restrict, -- Optional: Primary service for display
    
    start_time timestamptz not null,
    end_time timestamptz not null,
    
    status text check (status in ('pending', 'confirmed', 'completed', 'cancelled', 'no_show', 'blocked')) default 'pending',
    
    -- Google Calendar Sync
    google_calendar_event_id text,
    sync_status text check (sync_status in ('synced', 'failed', 'pending')) default 'pending',
    
    notes text,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

alter table public.appointments enable row level security;

create policy "Tenant isolation for appointments"
    on public.appointments for all
    using (tenant_id in (
        select tenant_id from public.profiles where id = auth.uid()
    ));

-- -----------------------------------------------------------------------------
-- 5.1 Appointment Items (預約細項 - 多服務支持)
-- -----------------------------------------------------------------------------
create table public.appointment_items (
    id uuid primary key default uuid_generate_v4(),
    appointment_id uuid references public.appointments(id) on delete cascade not null,
    service_id uuid references public.services(id) on delete restrict not null,
    price decimal(10, 2) not null, -- Snapshot price
    duration integer not null, -- Snapshot duration
    created_at timestamptz default now()
);

alter table public.appointment_items enable row level security;

create policy "Tenant isolation for appointment_items"
    on public.appointment_items for all
    using (appointment_id in (
        select id from public.appointments where tenant_id in (
            select tenant_id from public.profiles where id = auth.uid()
        )
    ));

-- -----------------------------------------------------------------------------
-- 6. Helper Function: Get Current Tenant ID
-- 方便前端或 API 調用時快速獲取當前用戶的 Tenant
-- -----------------------------------------------------------------------------
drop function if exists public.get_my_tenant_id();

create or replace function public.get_my_tenant_id()
returns uuid as $$
    select tenant_id from public.profiles where id = auth.uid();
$$ language sql security definer;
