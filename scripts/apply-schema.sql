-- ============================================
-- 員工權限管理系統 Schema
-- 在 Supabase SQL Editor 中執行此檔案
-- ============================================

-- 1. 角色表 (預設 3 種角色)
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

-- 2. 擴展 staff 表
DO $$
BEGIN
    -- 添加新欄位到現有 staff 表
    ALTER TABLE staff ADD COLUMN IF NOT EXISTS role_id uuid REFERENCES roles(id);
    ALTER TABLE staff ADD COLUMN IF NOT EXISTS invited_by uuid REFERENCES staff(id);
    ALTER TABLE staff ADD COLUMN IF NOT EXISTS invited_at timestamptz;
    ALTER TABLE staff ADD COLUMN IF NOT EXISTS joined_at timestamptz;
    ALTER TABLE staff ADD COLUMN IF NOT EXISTS invite_token text;
    ALTER TABLE staff ADD COLUMN IF NOT EXISTS invite_expires_at timestamptz;
END $$;

-- 3. 操作日誌表
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

-- 4. 索引
CREATE INDEX IF NOT EXISTS idx_staff_role ON staff(role_id);
CREATE INDEX IF NOT EXISTS idx_staff_invite_token ON staff(invite_token) WHERE invite_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_logs_tenant ON activity_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_logs_staff ON activity_logs(staff_id);
CREATE INDEX IF NOT EXISTS idx_logs_created ON activity_logs(created_at);

-- 5. RLS 政策
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS logs_tenant_isolation ON activity_logs;
CREATE POLICY logs_tenant_isolation ON activity_logs
    FOR ALL
    USING (
        tenant_id IN (
            SELECT tenant_id FROM profiles WHERE id = auth.uid()
        )
    );

-- 6. 記錄操作日誌的函數
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

-- ============================================
-- 7. 遷移現有數據（重要！）
-- ============================================

-- 7.1 為現有 staff 記錄分配 admin 角色
DO $$
DECLARE
    admin_role_id uuid;
BEGIN
    -- 取得 admin 角色的 ID
    SELECT id INTO admin_role_id FROM roles WHERE name = 'admin';
    
    -- 更新所有沒有 role_id 的 staff 記錄為 admin
    UPDATE staff 
    SET role_id = admin_role_id
    WHERE role_id IS NULL;
    
    RAISE NOTICE '已將所有現有員工設為 admin 角色';
END $$;

-- 7.2 為現有 profiles 添加 staff 記錄（如果沒有的話）
DO $$
DECLARE
    admin_role_id uuid;
    profile_record RECORD;
BEGIN
    -- 取得 admin 角色的 ID
    SELECT id INTO admin_role_id FROM roles WHERE name = 'admin';
    
    -- 為每個沒有 staff 記錄的 profile 創建 staff 記錄
    FOR profile_record IN 
        SELECT p.id, p.tenant_id, p.full_name, p.phone
        FROM profiles p
        LEFT JOIN staff s ON s.user_id = p.id
        WHERE s.id IS NULL AND p.tenant_id IS NOT NULL
    LOOP
        INSERT INTO staff (
            tenant_id,
            user_id,
            full_name,
            display_name,
            role_id,
            is_active,
            joined_at
        )
        VALUES (
            profile_record.tenant_id,
            profile_record.id,
            COALESCE(profile_record.full_name, '管理者'),
            COALESCE(profile_record.full_name, '管理者'),
            admin_role_id,
            true,
            now()
        );
        
        RAISE NOTICE '已為用戶 % 創建 staff 記錄', profile_record.id;
    END LOOP;
END $$;

-- ============================================
-- 完成！
-- ============================================
