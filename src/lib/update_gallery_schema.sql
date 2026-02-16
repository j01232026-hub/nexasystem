
-- Add author_id and author_name to gallery_posts table
ALTER TABLE public.gallery_posts 
ADD COLUMN IF NOT EXISTS author_id uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS author_name text;

-- Update existing rows to have a default author (optional, if you want to backfill)
-- UPDATE public.gallery_posts SET author_name = 'Admin' WHERE author_name IS NULL;
