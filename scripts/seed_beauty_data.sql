
-- ==========================================
-- SEED DATA: Beauty Salon (Nail, Lash, Skin)
-- ==========================================
-- Description: 清除現有業務數據，並填入「美甲/美睫/皮膚管理」場景的測試資料。
-- Tenant: 保留現有登入帳號，僅重置其關聯的業務數據。

-- 1. 清理舊資料 (依序刪除以避免 Foreign Key 錯誤)
DELETE FROM appointment_items;
DELETE FROM appointments;
DELETE FROM customers;
DELETE FROM staff;
DELETE FROM services;
DELETE FROM service_categories;

-- 2. 建立服務分類 (Service Categories)
DO $$
DECLARE
    -- 設定固定的測試 Tenant ID，方便開發與測試
    target_tenant_id UUID := 'd00d00d0-0000-4000-a000-000000000001';
    
    cat_skin_id UUID;
    cat_nail_id UUID;
    cat_lash_id UUID;
    
    svc_skin_clean_id UUID;
    svc_skin_peel_id UUID;
    svc_nail_single_id UUID;
    svc_nail_design_id UUID;
    svc_nail_foot_id UUID;
    svc_lash_natural_id UUID;
    svc_lash_volume_id UUID;

    staff_jessica_id UUID;
    staff_nana_id UUID;
    staff_ivy_id UUID;
    
    cust_amy_id UUID;
    cust_bella_id UUID;
    cust_chloe_id UUID;

    app_1_id UUID;
    app_2_id UUID;
    app_3_id UUID;
    app_4_id UUID;
BEGIN
    -- 1. 確保測試 Tenant 存在
    -- 如果 ID 衝突則更新，如果 Slug 衝突則可能報錯 (請確保開發環境乾淨)
    INSERT INTO tenants (id, name, slug, theme_color)
    VALUES (target_tenant_id, 'NEXA Salon Demo', 'nexa-demo', '#7C3AED')
    ON CONFLICT (id) DO UPDATE 
    SET theme_color = EXCLUDED.theme_color; -- 確保顏色被更新

    RAISE NOTICE 'Using Tenant ID: %', target_tenant_id;

    -- ==========================================
    -- 2. 插入服務分類
    -- ==========================================
    INSERT INTO service_categories (tenant_id, name, color)
    VALUES (target_tenant_id, '皮膚管理 (Skin Care)', '#EC4899') -- Pink
    RETURNING id INTO cat_skin_id;

    INSERT INTO service_categories (tenant_id, name, color)
    VALUES (target_tenant_id, '凝膠美甲 (Nail Art)', '#8B5CF6') -- Violet
    RETURNING id INTO cat_nail_id;

    INSERT INTO service_categories (tenant_id, name, color)
    VALUES (target_tenant_id, '韓式美睫 (Eyelash)', '#10B981') -- Emerald
    RETURNING id INTO cat_lash_id;

    -- ==========================================
    -- 3. 插入服務項目
    -- ==========================================
    -- 皮膚管理
    INSERT INTO services (tenant_id, category_id, name, duration, price, description, is_active) VALUES
    (target_tenant_id, cat_skin_id, '水飛梭深層清潔', 90, 2500, '包含卸妝、潔面、水飛梭、保濕導入、軟膜', true)
    RETURNING id INTO svc_skin_clean_id;
    
    INSERT INTO services (tenant_id, category_id, name, duration, price, description, is_active) VALUES
    (target_tenant_id, cat_skin_id, '海藻微針煥膚', 120, 3200, '改善痘坑痘印，術後需修復期', true)
    RETURNING id INTO svc_skin_peel_id;

    -- 美甲
    INSERT INTO services (tenant_id, category_id, name, duration, price, description, is_active) VALUES
    (target_tenant_id, cat_nail_id, '單色凝膠 (手部)', 60, 1000, '包含基礎保養、單色上色', true)
    RETURNING id INTO svc_nail_single_id;
    
    INSERT INTO services (tenant_id, category_id, name, duration, price, description, is_active) VALUES
    (target_tenant_id, cat_nail_id, '造型設計款 (不限時)', 120, 1800, '依現場溝通款式為主，含建構', true)
    RETURNING id INTO svc_nail_design_id;
    
    INSERT INTO services (tenant_id, category_id, name, duration, price, description, is_active) VALUES
    (target_tenant_id, cat_nail_id, '深層足部護理', 90, 1500, '去角質、按摩、敷膜', true)
    RETURNING id INTO svc_nail_foot_id;

    -- 美睫
    INSERT INTO services (tenant_id, category_id, name, duration, price, description, is_active) VALUES
    (target_tenant_id, cat_lash_id, '3D 自然款 (150根)', 60, 1200, '適合素顏日常', true)
    RETURNING id INTO svc_lash_natural_id;
    
    INSERT INTO services (tenant_id, category_id, name, duration, price, description, is_active) VALUES
    (target_tenant_id, cat_lash_id, '6D 濃密款 (400根)', 90, 2000, '適合派對或喜歡妝感者', true)
    RETURNING id INTO svc_lash_volume_id;

    -- ==========================================
    -- 4. 插入員工 (Staff)
    -- ==========================================
    INSERT INTO staff (tenant_id, full_name, display_name, role, bio, avatar_url, is_active)
    VALUES (target_tenant_id, 'Jessica', '店長 Jessica', 'manager', '資深皮膚管理師，專注問題肌膚調理', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Jessica', true)
    RETURNING id INTO staff_jessica_id;

    INSERT INTO staff (tenant_id, full_name, display_name, role, bio, avatar_url, is_active)
    VALUES (target_tenant_id, 'Nana', '美甲師 Nana', 'stylist', '擅長日系暈染、手繪風格', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Nana', true)
    RETURNING id INTO staff_nana_id;

    INSERT INTO staff (tenant_id, full_name, display_name, role, bio, avatar_url, is_active)
    VALUES (target_tenant_id, 'Ivy', '美睫師 Ivy', 'stylist', '細心溫柔，專精根元矯正', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Ivy', true)
    RETURNING id INTO staff_ivy_id;

    -- ==========================================
    -- 5. 插入客戶 (Customers)
    -- ==========================================
    INSERT INTO customers (tenant_id, name, phone, line_user_id, notes, tags)
    VALUES (target_tenant_id, '林曉美 (Amy)', '0912345678', 'line_amy', '皮膚偏乾，容易過敏', ARRAY['VIP', '敏感肌'])
    RETURNING id INTO cust_amy_id;

    INSERT INTO customers (tenant_id, name, phone, line_user_id, notes, tags)
    VALUES (target_tenant_id, '陳貝拉 (Bella)', '0922333444', 'line_bella', '喜歡誇張的指甲款式', ARRAY['美甲控'])
    RETURNING id INTO cust_bella_id;

    INSERT INTO customers (tenant_id, name, phone, line_user_id, notes, tags)
    VALUES (target_tenant_id, '張可樂 (Chloe)', '0988777666', 'line_chloe', '睫毛容易倒插', ARRAY['一般會員'])
    RETURNING id INTO cust_chloe_id;

    -- ==========================================
    -- 6. 插入預約 (Appointments) & 預約細項 (Items)
    -- ==========================================
    
    -- 1. 過去的預約 (已完成) - Jessica / Amy / 水飛梭
    INSERT INTO appointments (tenant_id, staff_id, customer_id, service_id, start_time, end_time, status, notes)
    VALUES (target_tenant_id, staff_jessica_id, cust_amy_id, svc_skin_clean_id, NOW() - INTERVAL '3 days' + INTERVAL '14 hours', NOW() - INTERVAL '3 days' + INTERVAL '15 hours 30 minutes', 'completed', '客人很滿意')
    RETURNING id INTO app_1_id;

    INSERT INTO appointment_items (appointment_id, service_id, price, duration)
    VALUES (app_1_id, svc_skin_clean_id, 2500, 90);

    -- 2. 過去的預約 (已完成) - Nana / Bella / 造型設計
    INSERT INTO appointments (tenant_id, staff_id, customer_id, service_id, start_time, end_time, status, notes)
    VALUES (target_tenant_id, staff_nana_id, cust_bella_id, svc_nail_design_id, NOW() - INTERVAL '2 days' + INTERVAL '10 hours', NOW() - INTERVAL '2 days' + INTERVAL '12 hours', 'completed', '下次想做貓眼')
    RETURNING id INTO app_2_id;

    INSERT INTO appointment_items (appointment_id, service_id, price, duration)
    VALUES (app_2_id, svc_nail_design_id, 1800, 120);

    -- 3. 未來的預約 (已確認) - Nana / Amy / 單色凝膠
    INSERT INTO appointments (tenant_id, staff_id, customer_id, service_id, start_time, end_time, status, notes)
    VALUES (target_tenant_id, staff_nana_id, cust_amy_id, svc_nail_single_id, NOW() + INTERVAL '1 day' + INTERVAL '14 hours', NOW() + INTERVAL '1 day' + INTERVAL '15 hours', 'confirmed', '要卸甲')
    RETURNING id INTO app_3_id;

    INSERT INTO appointment_items (appointment_id, service_id, price, duration)
    VALUES (app_3_id, svc_nail_single_id, 1000, 60);

    -- 4. 未來的預約 (已確認) - Ivy / Chloe / 3D自然款
    INSERT INTO appointments (tenant_id, staff_id, customer_id, service_id, start_time, end_time, status, notes)
    VALUES (target_tenant_id, staff_ivy_id, cust_chloe_id, svc_lash_natural_id, NOW() + INTERVAL '2 days' + INTERVAL '11 hours', NOW() + INTERVAL '2 days' + INTERVAL '12 hours', 'confirmed', '')
    RETURNING id INTO app_4_id;

    INSERT INTO appointment_items (appointment_id, service_id, price, duration)
    VALUES (app_4_id, svc_lash_natural_id, 1200, 60);

    -- 5. 鎖定時段 (Blocking) - Jessica
    -- Blocked status doesn't need customer or service, just time and staff
    INSERT INTO appointments (tenant_id, staff_id, start_time, end_time, status, notes)
    VALUES (target_tenant_id, staff_jessica_id, NOW() + INTERVAL '1 day' + INTERVAL '10 hours', NOW() + INTERVAL '1 day' + INTERVAL '13 hours', 'blocked', '外出進修');

END $$;
