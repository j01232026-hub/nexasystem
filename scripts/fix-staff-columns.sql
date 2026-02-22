-- ============================================
-- 修復 staff 表缺少的欄位
-- ============================================

-- 1. 添加 job_title 欄位
ALTER TABLE staff ADD COLUMN IF NOT EXISTS job_title text DEFAULT '美容師';

-- 2. 添加 specialties 欄位
ALTER TABLE staff ADD COLUMN IF NOT EXISTS specialties text[];

-- 3. 將舊的 name 欄位改為 full_name（如果存在）
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'staff' AND column_name = 'name') THEN
        ALTER TABLE staff RENAME COLUMN name TO full_name;
    END IF;
END $$;

-- 4. 確認欄位已添加
SELECT 
    column_name, 
    data_type,
    column_default
FROM information_schema.columns 
WHERE table_name = 'staff' 
ORDER BY ordinal_position;
