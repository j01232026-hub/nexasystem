-- ============================================
-- 清理並重新建立員工權限系統
-- 警告：這會刪除現有 staff 資料，請先備份！
-- ============================================

-- 1. 先備份現有資料（可選）
-- CREATE TABLE staff_backup AS SELECT * FROM staff;

-- 2. 清理現有資料
DELETE FROM staff_services WHERE staff_id IN (SELECT id FROM staff WHERE user_id IS NOT NULL);
DELETE FROM activity_logs WHERE staff_id IN (SELECT id FROM staff WHERE user_id IS NOT NULL);
DELETE FROM staff WHERE user_id IS NOT NULL;

-- 3. 角色表 (預設 3 種角色)
CREATE TABLE IF NOT EXISTS roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL UNIQUE,
    display_name text NOT NULL,
    description text,
    permissions jsonb NOT NULL DEFAULT '{}',
    is_system boolean DEFAULT true,
    created_at timestamptz DEFAULT now()
);

-- 插入預設角色
INSERT INTO roles (name, display_name, description, permissions, is_system) VALUES
('admin', '老闆', '店家負責人，擁有全部權限', '{
    "manage_settings": true,
    "manage_staff": true,
    "manage_appointments": true,
    "manage_customers": true,
    "view_reports": true,
    "view_all_appointments": true,
    "delete_data": true,
    "manage_branches": true
}', true),

('manager', '店長', '實際管理者，可管理日常營運', '{
    "manage_settings": false,
    "manage_staff": true,
    "manage_appointments": true,
    "manage_customers": true,
    "view_reports": true,
    "view_all_appointments": true,
    "delete_data": false,
    "manage_branches": false
}', true),

('staff', '員工', '美容師/設計師，僅能查看自己的預約', '{
    "manage_settings": false,
    "manage_staff": false,
    "manage_appointments": false,
    "manage_customers": false,
    "view_reports": false,
    "view_own_appointments": true,
    "delete_data": false,
    "manage_branches": false
}', true)
ON CONFLICT (name) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    description = EXCLUDED.description,
    permissions = EXCLUDED.permissions;

-- 4. 擴展 staff 表（添加新欄位）
DO $$
BEGIN
    ALTER TABLE staff ADD COLUMN IF NOT EXISTS role_id uuid REFERENCES roles(id);
    ALTER TABLE staff ADD COLUMN IF NOT EXISTS invited_by uuid REFERENCES staff(id);
    ALTER TABLE staff ADD COLUMN IF NOT EXISTS invited_at timestamptz;
    ALTER TABLE staff ADD COLUMN IF NOT EXISTS joined_at timestamptz;
    ALTER TABLE staff ADD COLUMN IF NOT EXISTS invite_token text;
    ALTER TABLE staff ADD COLUMN IF NOT EXISTS invite_expires_at timestamptz;
    ALTER TABLE staff ADD COLUMN IF NOT EXISTS phone text;
    ALTER TABLE staff ADD COLUMN IF NOT EXISTS email text;
END $$;

-- 5. 操作日誌表
CREATE TABLE IF NOT EXISTS activity_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE,
    staff_id uuid REFERENCES staff(id) ON DELETE SET NULL,
    user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    action text NOT NULL,
    action_display text,
    target_type text,
    target_id uuid,
    details jsonb,
    changes jsonb,
    ip_address text,
    user_agent text,
    created_at timestamptz DEFAULT now()
);

-- 6. 索引
CREATE INDEX IF NOT EXISTS idx_staff_role ON staff(role_id);
CREATE INDEX IF NOT EXISTS idx_staff_invite_token ON staff(invite_token) WHERE invite_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_logs_tenant ON activity_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_logs_staff ON activity_logs(staff_id);
CREATE INDEX IF NOT EXISTS idx_logs_created ON activity_logs(created_at);

-- 7. RLS 政策
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS logs_tenant_isolation ON activity_logs;
CREATE POLICY logs_tenant_isolation ON activity_logs
    FOR ALL
    USING (
        tenant_id IN (
            SELECT tenant_id FROM profiles WHERE id = auth.uid()
        )
    );

-- 8. 記錄操作日誌的函數
CREATE OR REPLACE FUNCTION log_activity(
    p_tenant_id uuid,
    p_staff_id uuid,
    p_action text,
    p_action_display text,
    p_target_type text,
    p_target_id uuid,
    p_details jsonb DEFAULT '{}',
    p_changes jsonb DEFAULT null
)
RETURNS void AS $$
BEGIN
    INSERT INTO activity_logs (
        tenant_id, staff_id, user_id,
        action, action_display, target_type, target_id,
        details, changes
    ) VALUES (
        p_tenant_id, p_staff_id, auth.uid(),
        p_action, p_action_display, p_target_type, p_target_id,
        p_details, p_changes
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. 為現有 profiles 創建 staff 記錄（老闆）
DO $$
DECLARE
    admin_role_id uuid;
    profile_record RECORD;
    user_email text;
BEGIN
    -- 取得 admin 角色的 ID
    SELECT id INTO admin_role_id FROM roles WHERE name = 'admin';
    
    -- 為每個 profile 創建 staff 記錄
    FOR profile_record IN 
        SELECT p.id, p.tenant_id, p.full_name, p.phone
        FROM profiles p
        WHERE p.tenant_id IS NOT NULL
    LOOP
        -- 取得用戶 email
        SELECT email INTO user_email FROM auth.users WHERE id = profile_record.id;
        
        -- 檢查是否已存在
        IF NOT EXISTS (SELECT 1 FROM staff WHERE user_id = profile_record.id) THEN
            INSERT INTO staff (
                tenant_id,
                user_id,
                full_name,
                display_name,
                phone,
                email,
                role_id,
                is_active,
                joined_at
            )
            VALUES (
                profile_record.tenant_id,
                profile_record.id,
                COALESCE(profile_record.full_name, '管理者'),
                COALESCE(profile_record.full_name, '管理者'),
                profile_record.phone,
                user_email,
                admin_role_id,
                true,
                now()
            );
            
            RAISE NOTICE '已為用戶 % 創建 staff 記錄', profile_record.id;
        ELSE
            -- 更新現有記錄
            UPDATE staff 
            SET 
                role_id = admin_role_id,
                phone = profile_record.phone,
                email = user_email,
                joined_at = COALESCE(joined_at, now())
            WHERE user_id = profile_record.id;
            
            RAISE NOTICE '已更新用戶 % 的 staff 記錄', profile_record.id;
        END IF;
    END LOOP;
END $$;

-- ============================================
-- 完成！
-- ============================================

-- 驗證結果
SELECT 
    r.display_name as role,
    COUNT(*) as count
FROM staff s
JOIN roles r ON s.role_id = r.id
GROUP BY r.display_name;
