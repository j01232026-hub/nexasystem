-- Add color column to service_categories table
ALTER TABLE public.service_categories 
ADD COLUMN IF NOT EXISTS color text DEFAULT 'rose';

-- Update existing rows to have a default color if needed (though default handles new ones)
UPDATE public.service_categories SET color = 'rose' WHERE color IS NULL;
