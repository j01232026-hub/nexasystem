-- ============================================
-- 修復：允許新用戶創建第一個 tenant（店家）
-- 這是給老闆註冊時使用的特殊權限
-- ============================================

-- 1. 先刪除現有的限制政策（如果存在）
DROP POLICY IF EXISTS "Users can view their own tenant" ON tenants;
DROP POLICY IF EXISTS "Users can update their own tenant" ON tenants;
DROP POLICY IF EXISTS "Users can insert new tenant" ON tenants;

-- 2. 創建新的 RLS 政策組

-- 2.1 允許任何人查看所有 tenants（公開資訊）
CREATE POLICY "Anyone can view tenants"
ON tenants FOR SELECT
TO authenticated
USING (true);

-- 2.2 允許任何人創建 tenant（註冊時需要）
CREATE POLICY "Anyone can create tenant"
ON tenants FOR INSERT
TO authenticated
WITH CHECK (true);

-- 2.3 允許用戶更新自己的 tenant
CREATE POLICY "Users can update their own tenant"
ON tenants FOR UPDATE
TO authenticated
USING (
  id IN (
    SELECT tenant_id FROM profiles WHERE id = auth.uid()
  )
  OR id IN (
    SELECT tenant_id FROM staff WHERE user_id = auth.uid()
  )
);

-- 2.4 允許用戶刪除自己的 tenant
CREATE POLICY "Users can delete their own tenant"
ON tenants FOR DELETE
TO authenticated
USING (
  id IN (
    SELECT tenant_id FROM profiles WHERE id = auth.uid()
  )
  OR id IN (
    SELECT tenant_id FROM staff WHERE user_id = auth.uid()
  )
);

-- 3. 確保權限正確
GRANT ALL ON tenants TO authenticated;
GRANT ALL ON profiles TO authenticated;
GRANT ALL ON staff TO authenticated;

-- 4. 確保 RLS 已啟用
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;

-- 5. 顯示成功訊息
SELECT 'Tenant creation RLS policies updated successfully!' AS message;
