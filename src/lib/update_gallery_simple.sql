-- Simple update to add tenant_id to gallery tables

-- 1. Add tenant_id to gallery_posts (allow null initially)
ALTER TABLE public.gallery_posts 
ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);

-- 2. Add tenant_id to gallery_likes (allow null initially)
ALTER TABLE public.gallery_likes 
ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);

-- 3. Update RLS policies to be more flexible
DROP POLICY IF EXISTS "Allow authenticated upload" ON public.gallery_posts;
DROP POLICY IF EXISTS "Allow authenticated update" ON public.gallery_posts;
DROP POLICY IF EXISTS "Allow authenticated delete" ON public.gallery_posts;

-- 上傳政策 - 檢查用戶是否已驗證
CREATE POLICY "Allow authenticated upload" ON public.gallery_posts 
FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- 更新政策 - 檢查用戶是否已驗證
CREATE POLICY "Allow authenticated update" ON public.gallery_posts 
FOR UPDATE USING (auth.role() = 'authenticated');

-- 刪除政策 - 檢查用戶是否已驗證
CREATE POLICY "Allow authenticated delete" ON public.gallery_posts 
FOR DELETE USING (auth.role() = 'authenticated');