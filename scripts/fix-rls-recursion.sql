-- ============================================
-- 修復 RLS 無限循環問題
-- ============================================

-- 1. 完全重置 profiles 表的 RLS 政策
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS profiles_tenant_isolation ON profiles;
DROP POLICY IF EXISTS profiles_select_policy ON profiles;
DROP POLICY IF EXISTS profiles_insert_policy ON profiles;
DROP POLICY IF EXISTS profiles_update_policy ON profiles;
DROP POLICY IF EXISTS profiles_delete_policy ON profiles;

-- 2. 重新啟用 RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 3. 創建簡化的 profiles 政策（避免循環引用）

-- SELECT: 用戶可以查看自己的 profile，或者所有 profile（簡化處理）
CREATE POLICY profiles_select_policy ON profiles
    FOR SELECT
    USING (id = auth.uid());

-- INSERT: 用戶只能創建自己的 profile
CREATE POLICY profiles_insert_policy ON profiles
    FOR INSERT
    WITH CHECK (id = auth.uid());

-- UPDATE: 用戶只能更新自己的 profile
CREATE POLICY profiles_update_policy ON profiles
    FOR UPDATE
    USING (id = auth.uid());

-- DELETE: 用戶只能刪除自己的 profile
CREATE POLICY profiles_delete_policy ON profiles
    FOR DELETE
    USING (id = auth.uid());

-- 4. 同樣簡化 staff 表的政策
ALTER TABLE staff DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS staff_tenant_isolation ON staff;
DROP POLICY IF EXISTS staff_select_policy ON staff;
DROP POLICY IF EXISTS staff_insert_policy ON staff;
DROP POLICY IF EXISTS staff_update_policy ON staff;
DROP POLICY IF EXISTS staff_delete_policy ON staff;

ALTER TABLE staff ENABLE ROW LEVEL SECURITY;

-- SELECT: 用戶可以查看自己的 staff 記錄
CREATE POLICY staff_select_policy ON staff
    FOR SELECT
    USING (user_id = auth.uid());

-- INSERT: 用戶可以創建自己的 staff 記錄
CREATE POLICY staff_insert_policy ON staff
    FOR INSERT
    WITH CHECK (user_id = auth.uid());

-- UPDATE: 用戶可以更新自己的 staff 記錄
CREATE POLICY staff_update_policy ON staff
    FOR UPDATE
    USING (user_id = auth.uid());

-- DELETE: 用戶可以刪除自己的 staff 記錄
CREATE POLICY staff_delete_policy ON staff
    FOR DELETE
    USING (user_id = auth.uid());

-- 5. 確認政策已創建
SELECT 
    tablename,
    policyname,
    cmd
FROM pg_policies 
WHERE tablename IN ('staff', 'profiles')
ORDER BY tablename, policyname;
