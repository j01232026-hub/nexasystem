-- Fix gallery_posts table structure
-- Run this in Supabase SQL Editor

-- Check if gallery_posts exists and show current structure
\d public.gallery_posts;

-- Add missing columns if they don't exist
ALTER TABLE public.gallery_posts 
ADD COLUMN IF NOT EXISTS author_id uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS author_name text;

-- Update RLS policies for better security
DROP POLICY IF EXISTS "Allow authenticated delete" ON public.gallery_posts;

-- Create delete policy that allows authenticated users to delete their own posts
CREATE POLICY "Allow delete by author" ON public.gallery_posts 
FOR DELETE USING (
  auth.uid() = author_id
);