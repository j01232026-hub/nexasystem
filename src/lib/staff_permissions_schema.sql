-- ============================================
-- 員工權限管理系統 Schema
-- 美業 SaaS - 3 角色權限設計
-- ============================================

-- 1. 角色表 (預設 3 種角色)
CREATE TABLE IF NOT EXISTS roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL UNIQUE, -- 'admin', 'manager', 'staff'
    display_name text NOT NULL,
    description text,
    permissions jsonb NOT NULL DEFAULT '{}',
    is_system boolean DEFAULT true, -- 系統預設角色不可刪除
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
}', true);

-- 2. 擴展 staff 表（如果不存在則建立，存在則添加欄位）
DO $$
BEGIN
    -- 檢查 staff 表是否存在
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'staff') THEN
        CREATE TABLE staff (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE,
            user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
            
            -- 基本資料
            name text NOT NULL,
            email text,
            phone text,
            avatar_url text,
            
            -- 角色（關聯 roles 表）
            role_id uuid REFERENCES roles(id),
            
            -- 工作相關
            job_title text DEFAULT '美容師',
            specialties text[], -- 專長項目
            
            -- 狀態
            is_active boolean DEFAULT true,
            can_book_online boolean DEFAULT true,
            
            -- 時間戳
            created_at timestamptz DEFAULT now(),
            updated_at timestamptz DEFAULT now(),
            
            -- 邀請相關
            invited_by uuid REFERENCES staff(id),
            invited_at timestamptz,
            joined_at timestamptz,
            
            -- 邀請 Token（用於郵件邀請）
            invite_token text,
            invite_expires_at timestamptz
        );
    ELSE
        -- 添加新欄位到現有 staff 表
        ALTER TABLE staff ADD COLUMN IF NOT EXISTS role_id uuid REFERENCES roles(id);
        ALTER TABLE staff ADD COLUMN IF NOT EXISTS invited_by uuid REFERENCES staff(id);
        ALTER TABLE staff ADD COLUMN IF NOT EXISTS invited_at timestamptz;
        ALTER TABLE staff ADD COLUMN IF NOT EXISTS joined_at timestamptz;
        ALTER TABLE staff ADD COLUMN IF NOT EXISTS invite_token text;
        ALTER TABLE staff ADD COLUMN IF NOT EXISTS invite_expires_at timestamptz;
    END IF;
END $$;

-- 3. 操作日誌表
CREATE TABLE IF NOT EXISTS activity_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE,
    staff_id uuid REFERENCES staff(id) ON DELETE SET NULL,
    user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    
    -- 操作資訊
    action text NOT NULL, -- 'CREATE_APPOINTMENT', 'UPDATE_STATUS', 'DELETE_CUSTOMER'
    action_display text, -- 中文顯示名稱
    target_type text, -- 'appointment', 'customer', 'staff'
    target_id uuid,
    
    -- 詳細內容
    details jsonb,
    changes jsonb, -- 變更前後的差異
    
    -- 裝置資訊
    ip_address text,
    user_agent text,
    
    created_at timestamptz DEFAULT now()
);

-- 4. 索引
CREATE INDEX IF NOT EXISTS idx_staff_tenant ON staff(tenant_id);
CREATE INDEX IF NOT EXISTS idx_staff_user ON staff(user_id);
CREATE INDEX IF NOT EXISTS idx_staff_role ON staff(role_id);
CREATE INDEX IF NOT EXISTS idx_staff_invite_token ON staff(invite_token) WHERE invite_token IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_logs_tenant ON activity_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_logs_staff ON activity_logs(staff_id);
CREATE INDEX IF NOT EXISTS idx_logs_created ON activity_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_logs_action ON activity_logs(action);

-- 5. RLS 政策 (Row Level Security)

-- Staff 表 RLS
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;

-- 用戶只能看到自己 tenant 的 staff
CREATE POLICY staff_tenant_isolation ON staff
    FOR ALL
    USING (
        tenant_id IN (
            SELECT tenant_id FROM profiles WHERE id = auth.uid()
        )
    );

-- Activity Logs RLS
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY logs_tenant_isolation ON activity_logs
    FOR ALL
    USING (
        tenant_id IN (
            SELECT tenant_id FROM profiles WHERE id = auth.uid()
        )
    );

-- 6. 觸發器：自動更新 updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_staff_updated_at ON staff;
CREATE TRIGGER update_staff_updated_at
    BEFORE UPDATE ON staff
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 7. 記錄操作日誌的函數
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
-- 說明：
-- 1. 執行此 SQL 後，會建立 roles, activity_logs 表
-- 2. 擴展現有 staff 表，添加 role_id 等欄位
-- 3. 預設 3 種角色：老闆(admin)、店長(manager)、員工(staff)
-- 4. RLS 確保數據隔離
-- ============================================
