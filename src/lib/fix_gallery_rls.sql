-- Fix RLS policies for gallery functionality

-- Ensure service_categories has proper RLS for tenant isolation
ALTER TABLE public.service_categories ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Service categories are viewable by tenant users" ON public.service_categories;
DROP POLICY IF EXISTS "Service categories are manageable by tenant users" ON public.service_categories;

-- Create policies for service_categories
CREATE POLICY "Service categories are viewable by tenant users" ON public.service_categories
    FOR SELECT
    USING (auth.uid() IN (
        SELECT id FROM public.profiles WHERE tenant_id = service_categories.tenant_id
    ));

CREATE POLICY "Service categories are manageable by tenant users" ON public.service_categories
    FOR ALL
    USING (auth.uid() IN (
        SELECT id FROM public.profiles WHERE tenant_id = service_categories.tenant_id AND role = 'admin'
    ));

-- Ensure services has proper RLS for tenant isolation  
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Services are viewable by tenant users" ON public.services;
DROP POLICY IF EXISTS "Services are manageable by tenant users" ON public.services;

-- Create policies for services
CREATE POLICY "Services are viewable by tenant users" ON public.services
    FOR SELECT
    USING (auth.uid() IN (
        SELECT id FROM public.profiles WHERE tenant_id = services.tenant_id
    ));

CREATE POLICY "Services are manageable by tenant users" ON public.services
    FOR ALL
    USING (auth.uid() IN (
        SELECT id FROM public.profiles WHERE tenant_id = services.tenant_id AND role = 'admin'
    ));

-- Ensure gallery_posts has proper RLS for tenant isolation
ALTER TABLE public.gallery_posts ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Gallery posts are viewable by tenant users" ON public.gallery_posts;
DROP POLICY IF EXISTS "Gallery posts are manageable by tenant users" ON public.gallery_posts;

-- Create policies for gallery_posts
CREATE POLICY "Gallery posts are viewable by tenant users" ON public.gallery_posts
    FOR SELECT
    USING (auth.uid() IN (
        SELECT id FROM public.profiles WHERE tenant_id = gallery_posts.tenant_id
    ));

CREATE POLICY "Gallery posts are manageable by tenant users" ON public.gallery_posts
    FOR ALL
    USING (auth.uid() IN (
        SELECT id FROM public.profiles WHERE tenant_id = gallery_posts.tenant_id AND role = 'admin'
    ));