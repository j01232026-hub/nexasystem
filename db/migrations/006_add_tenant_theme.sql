
-- Add theme_color to tenants table
ALTER TABLE public.tenants 
ADD COLUMN IF NOT EXISTS theme_color text DEFAULT '#7C3AED'; -- Default Purple

-- Optional: You might want to restrict this to specific hex codes later, 
-- but for now text is flexible.
