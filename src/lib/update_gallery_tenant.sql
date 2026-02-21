-- Update gallery schema to add tenant support

-- 1. Add tenant_id to gallery_posts
ALTER TABLE public.gallery_posts 
ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);

-- 2. Add tenant_id to gallery_likes (for consistency)
ALTER TABLE public.gallery_likes 
ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);

-- 3. Update existing records with default tenant (if needed)
-- 這裡假設有一個預設租戶，您需要根據實際情況調整
-- UPDATE public.gallery_posts SET tenant_id = (SELECT id FROM public.tenants LIMIT 1) WHERE tenant_id IS NULL;

-- 4. Make tenant_id required for new records
ALTER TABLE public.gallery_posts 
ALTER COLUMN tenant_id SET NOT NULL;

-- 5. Update RLS policies to include tenant filtering
DROP POLICY IF EXISTS "Allow authenticated upload" ON public.gallery_posts;
DROP POLICY IF EXISTS "Allow authenticated update" ON public.gallery_posts;

-- 新的上傳政策 - 檢查租戶權限
CREATE POLICY "Allow authenticated upload with tenant" ON public.gallery_posts 
FOR INSERT WITH CHECK (
  auth.role() = 'authenticated' AND 
  tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
);

-- 新的更新政策 - 檢查租戶權限  
CREATE POLICY "Allow authenticated update with tenant" ON public.gallery_posts 
FOR UPDATE USING (
  auth.role() = 'authenticated' AND 
  tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
);

-- 新的刪除政策 - 檢查租戶權限
CREATE POLICY "Allow authenticated delete with tenant" ON public.gallery_posts 
FOR DELETE USING (
  auth.role() = 'authenticated' AND 
  tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
);

-- 6. 更新讀取政策也加入租戶篩選
DROP POLICY IF EXISTS "Allow public read access" ON public.gallery_posts;
CREATE POLICY "Allow tenant read access" ON public.gallery_posts 
FOR SELECT USING (
  tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()) OR
  tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
);