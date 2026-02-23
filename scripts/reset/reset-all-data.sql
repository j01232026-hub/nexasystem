-- ============================================
-- 清除所有資料（保留資料表結構）
-- 用於測試完整註冊流程
-- ============================================

-- 1. 先禁用 RLS 以便刪除資料
ALTER TABLE activity_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE staff DISABLE ROW LEVEL SECURITY;
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE tenants DISABLE ROW LEVEL SECURITY;

-- 2. 清除資料（按照外鍵依賴順序）
-- 先清除有外鍵引用的表
DELETE FROM gallery_posts;
DELETE FROM appointment_items;
DELETE FROM appointments;
DELETE FROM services;
DELETE FROM topup_orders;
DELETE FROM transaction_ledger;
DELETE FROM activity_logs;
DELETE FROM staff;
DELETE FROM profiles;
DELETE FROM auth.users WHERE email NOT LIKE '%@nexa.com';
DELETE FROM tenants WHERE name != 'NEXA Demo Salon';

-- 3. 重置角色（保留預設角色）
-- 不需要刪除，保留即可

-- 4. 重新啟用 RLS
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

-- 5. 確認資料已清除
SELECT 'activity_logs' as table_name, COUNT(*) as count FROM activity_logs
UNION ALL
SELECT 'staff', COUNT(*) FROM staff
UNION ALL
SELECT 'profiles', COUNT(*) FROM profiles
UNION ALL
SELECT 'tenants', COUNT(*) FROM tenants;
