-- 修復 RLS 無限迴圈問題的 SQL 指令碼
-- 請在 Supabase Dashboard 的 SQL Editor 中執行此檔案內容

-- 1. 建立一個安全函數來獲取當前用戶的 tenant_id，避開 RLS 檢查 (Security Definer)
CREATE OR REPLACE FUNCTION get_my_tenant_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT tenant_id FROM profiles WHERE id = auth.uid();
$$;

-- 2. 刪除可能導致無限迴圈的舊策略
DROP POLICY IF EXISTS "Users can view profiles in same tenant" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

-- 3. 建立基礎策略：允許用戶查看自己的檔案
CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = id);

-- 4. 建立進階策略：允許用戶查看同一商戶下的其他檔案 (使用安全函數避免迴圈)
CREATE POLICY "Users can view profiles in same tenant"
ON public.profiles
FOR SELECT
USING (
  tenant_id = get_my_tenant_id()
);

-- 5. 確保用戶可以建立自己的檔案 (如果尚未存在)
CREATE POLICY "Users can insert their own profile"
ON public.profiles
FOR INSERT
WITH CHECK (auth.uid() = id);

-- 6. 確保 Tenant 讀取權限 (避免前端查詢失敗)
DROP POLICY IF EXISTS "Allow authenticated users to read tenants" ON public.tenants;
CREATE POLICY "Allow authenticated users to read tenants"
ON public.tenants
FOR SELECT
TO authenticated
USING (true);
