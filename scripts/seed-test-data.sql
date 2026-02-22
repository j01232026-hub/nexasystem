-- ============================================
-- 測試資料種子
-- 創建一個真實的測試場景
-- ============================================

-- 假設目前登入的是老闆，tenant_id 需要替換成實際值
-- 先取得第一個 tenant 的 ID
DO $$
DECLARE
    v_tenant_id uuid;
    admin_role_id uuid;
    manager_role_id uuid;
    staff_role_id uuid;
    boss_staff_id uuid;
BEGIN
    -- 取得角色 ID
    SELECT id INTO admin_role_id FROM roles WHERE name = 'admin';
    SELECT id INTO manager_role_id FROM roles WHERE name = 'manager';
    SELECT id INTO staff_role_id FROM roles WHERE name = 'staff';
    
    -- 取得第一個 tenant（假設這是測試店家）
    SELECT id INTO v_tenant_id FROM tenants LIMIT 1;
    
    IF v_tenant_id IS NULL THEN
        RAISE EXCEPTION '沒有找到 tenant，請先創建店家';
    END IF;
    
    RAISE NOTICE '使用 tenant_id: %', v_tenant_id;
    
    -- 1. 確保老闆的 staff 記錄存在
    SELECT id INTO boss_staff_id 
    FROM staff 
    WHERE tenant_id = v_tenant_id AND role_id = admin_role_id
    LIMIT 1;
    
    IF boss_staff_id IS NULL THEN
        RAISE EXCEPTION '沒有找到老闆的 staff 記錄，請先執行 reset-and-setup.sql';
    END IF;
    
    RAISE NOTICE '老闆 staff_id: %', boss_staff_id;
    
    -- 2. 創建店長（真實場景：店長可能還沒有系統帳號）
    IF NOT EXISTS (SELECT 1 FROM staff WHERE tenant_id = v_tenant_id AND full_name = '林小美') THEN
        INSERT INTO staff (
            tenant_id,
            full_name,
            display_name,
            phone,
            email,
            role_id,
            is_active,
            joined_at
        ) VALUES (
            v_tenant_id,
            '林小美',
            'Amy 店長',
            '0912-345-678',
            'amy@example.com',
            manager_role_id,
            true,
            now()
        );
        RAISE NOTICE '已創建店長：林小美';
    END IF;
    
    -- 3. 創建美容師（真實場景：有系統帳號的員工）
    IF NOT EXISTS (SELECT 1 FROM staff WHERE tenant_id = v_tenant_id AND full_name = '陳大文') THEN
        INSERT INTO staff (
            tenant_id,
            full_name,
            display_name,
            phone,
            email,
            role_id,
            is_active,
            joined_at
        ) VALUES (
            v_tenant_id,
            '陳大文',
            'David 老師',
            '0923-456-789',
            'david@example.com',
            staff_role_id,
            true,
            now()
        );
        RAISE NOTICE '已創建美容師：陳大文';
    END IF;
    
    -- 4. 創建另一位美容師（真實場景：被邀請但還沒接受）
    IF NOT EXISTS (SELECT 1 FROM staff WHERE tenant_id = v_tenant_id AND full_name = '張雅琪') THEN
        INSERT INTO staff (
            tenant_id,
            full_name,
            display_name,
            phone,
            email,
            role_id,
            is_active,
            invite_token,
            invite_expires_at,
            invited_by,
            invited_at
        ) VALUES (
            v_tenant_id,
            '張雅琪',
            'Vicky 助理',
            '0934-567-890',
            'vicky@example.com',
            staff_role_id,
            true,
            'test-invite-token-123',
            now() + interval '7 days',
            boss_staff_id,
            now()
        );
        RAISE NOTICE '已創建待邀請員工：張雅琪';
    END IF;
    
    -- 5. 創建離職員工（真實場景：測試停用功能）
    IF NOT EXISTS (SELECT 1 FROM staff WHERE tenant_id = v_tenant_id AND full_name = '王小明') THEN
        INSERT INTO staff (
            tenant_id,
            full_name,
            display_name,
            phone,
            email,
            role_id,
            is_active,
            joined_at
        ) VALUES (
            v_tenant_id,
            '王小明',
            '小明（已離職）',
            '0945-678-901',
            'xiaoming@example.com',
            staff_role_id,
            false,  -- 停用
            now() - interval '30 days'
        );
        RAISE NOTICE '已創建離職員工：王小明';
    END IF;
    
END $$;

-- ============================================
-- 顯示測試結果
-- ============================================

SELECT 
    s.full_name,
    s.display_name,
    s.phone,
    s.email,
    r.display_name as role,
    CASE 
        WHEN s.user_id IS NOT NULL THEN '已綁定帳號'
        WHEN s.invite_token IS NOT NULL THEN '等待邀請'
        ELSE '未綁定'
    END as account_status,
    s.is_active,
    s.joined_at
FROM staff s
JOIN roles r ON s.role_id = r.id
ORDER BY s.joined_at DESC;
