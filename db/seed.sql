-- -----------------------------------------------------------------------------
-- SEED DATA (測試數據)
-- 模擬多租戶場景
-- -----------------------------------------------------------------------------

-- 1. 建立兩個 Tenant
insert into public.tenants (id, name, slug, plan_type) values
    ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'NEXA 美學台北旗艦店', 'nexa-taipei', 'pro'),
    ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b22', 'Lisa 個人工作室', 'lisa-studio', 'lite')
on conflict (id) do nothing;

-- 2. 建立服務項目 (NEXA 台北 - 豐富課程)
insert into public.services (id, tenant_id, name, duration, price, category) values
    ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c33', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '極致保濕導入', 90, 2500, '臉部護理'),
    ('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380d44', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '全身精油舒壓', 120, 3200, '身體按摩'),
    ('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380e55', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '手部基礎保養', 45, 800, '美甲護理')
on conflict (id) do nothing;

-- 3. 建立服務項目 (Lisa 工作室 - 基礎課程)
insert into public.services (tenant_id, name, duration, price) values
    ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b22', '基礎淨痘', 60, 1200);

-- 4. 建立員工 (Staff) - NEXA 台北
insert into public.staff (id, tenant_id, full_name, display_name, role) values
    ('f0eebc99-9c0b-4ef8-bb6d-6bb9bd380f66', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '林小美', 'Amy 老師', 'manager'),
    ('f0eebc99-9c0b-4ef8-bb6d-6bb9bd380f77', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '陳大文', 'David 老師', 'stylist'),
    ('f0eebc99-9c0b-4ef8-bb6d-6bb9bd380f88', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '張雅琪', 'Vicky 助理', 'assistant')
on conflict (id) do nothing;

-- 5. 建立員工技能關聯 (Staff Services)
-- Amy: 全能
insert into public.staff_services (staff_id, service_id) values
    ('f0eebc99-9c0b-4ef8-bb6d-6bb9bd380f66', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c33'),
    ('f0eebc99-9c0b-4ef8-bb6d-6bb9bd380f66', 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380d44'),
    ('f0eebc99-9c0b-4ef8-bb6d-6bb9bd380f66', 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380e55');

-- David: 專攻身體
insert into public.staff_services (staff_id, service_id) values
    ('f0eebc99-9c0b-4ef8-bb6d-6bb9bd380f77', 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380d44');

-- Vicky: 專攻美甲
insert into public.staff_services (staff_id, service_id) values
    ('f0eebc99-9c0b-4ef8-bb6d-6bb9bd380f88', 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380e55');

-- 注意：Profiles 通常需要先在 auth.users 建立用戶才能關聯
-- 這裡僅為 SQL 結構示意，實際寫入需通過 Supabase Auth API
