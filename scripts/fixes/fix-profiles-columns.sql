-- ============================================
-- 修復 profiles 表缺少的欄位
-- ============================================

-- 1. 添加 email 欄位
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email text;

-- 2. 添加 phone 欄位（如果還沒有）
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone text;

-- 3. 添加 full_name 欄位（如果還沒有）
DO $$
BEGIN
    -- 檢查是否有 name 欄位，如果有則改名為 full_name
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'profiles' AND column_name = 'name') THEN
        ALTER TABLE profiles RENAME COLUMN name TO full_name;
    END IF;
    
    -- 如果沒有 full_name 欄位，則添加
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'full_name') THEN
        ALTER TABLE profiles ADD COLUMN full_name text;
    END IF;
END $$;

-- 4. 確認欄位已添加
SELECT 
    column_name, 
    data_type,
    column_default
FROM information_schema.columns 
WHERE table_name = 'profiles' 
ORDER BY ordinal_position;
