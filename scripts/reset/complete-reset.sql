-- ============================================
-- 完全重置（包含刪除資料表）
-- ⚠️ 警告：這會刪除所有資料和資料表結構！
-- ============================================

-- 1. 刪除所有資料表（按照外鍵依賴順序）
DROP TABLE IF EXISTS activity_logs CASCADE;
DROP TABLE IF EXISTS staff CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;
DROP TABLE IF EXISTS tenants CASCADE;
DROP TABLE IF EXISTS roles CASCADE;

-- 2. 刪除所有非系統用戶
DELETE FROM auth.users WHERE email NOT LIKE '%supabase%';  -- 保留系統帳號

-- 3. 重新執行完整的 schema 設置
-- 請手動執行 apply-schema.sql 或 staff_permissions_schema.sql

-- 4. 確認所有表已刪除
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public';
