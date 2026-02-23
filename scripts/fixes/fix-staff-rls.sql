-- ============================================
-- 修復 staff 表 RLS 政策
-- 允許用戶創建自己的 staff 記錄
-- ============================================

-- 1. 先刪除現有的限制政策（如果存在）
DROP POLICY IF EXISTS staff_tenant_isolation ON staff;

-- 2. 創建新的 RLS 政策組

-- 2.1 允許用戶查看自己 tenant 的所有 staff
CREATE POLICY staff_select_policy ON staff
    FOR SELECT
    USING (
        tenant_id IN (
            SELECT tenant_id FROM profiles WHERE id = auth.uid()
        )
        OR user_id = auth.uid()  -- 或者查看自己的記錄
    );

-- 2.2 允許用戶創建自己的 staff 記錄（當還沒有 profile 時）
CREATE POLICY staff_insert_policy ON staff
    FOR INSERT
    WITH CHECK (
        user_id = auth.uid()  -- 只能創建自己的記錄
    );

-- 2.3 允許用戶更新自己的 staff 記錄
CREATE POLICY staff_update_policy ON staff
    FOR UPDATE
    USING (
        tenant_id IN (
            SELECT tenant_id FROM profiles WHERE id = auth.uid()
        )
        OR user_id = auth.uid()
    );

-- 2.4 允許用戶刪除自己的 staff 記錄
CREATE POLICY staff_delete_policy ON staff
    FOR DELETE
    USING (
        tenant_id IN (
            SELECT tenant_id FROM profiles WHERE id = auth.uid()
        )
        OR user_id = auth.uid()
    );

-- 3. 同樣修復 profiles 表的 RLS
-- 先刪除現有政策
DROP POLICY IF EXISTS profiles_tenant_isolation ON profiles;
DROP POLICY IF EXISTS profiles_select_policy ON profiles;
DROP POLICY IF EXISTS profiles_insert_policy ON profiles;
DROP POLICY IF EXISTS profiles_update_policy ON profiles;

-- 創建新的 profiles 政策
CREATE POLICY profiles_select_policy ON profiles
    FOR SELECT
    USING (
        id = auth.uid()  -- 可以查看自己的 profile
        OR tenant_id IN (
            SELECT tenant_id FROM profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY profiles_insert_policy ON profiles
    FOR INSERT
    WITH CHECK (
        id = auth.uid()  -- 只能創建自己的 profile
    );

CREATE POLICY profiles_update_policy ON profiles
    FOR UPDATE
    USING (
        id = auth.uid()  -- 只能更新自己的 profile
        OR tenant_id IN (
            SELECT tenant_id FROM profiles WHERE id = auth.uid()
        )
    );

-- 4. 確認政策已創建
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename IN ('staff', 'profiles')
ORDER BY tablename, policyname;
