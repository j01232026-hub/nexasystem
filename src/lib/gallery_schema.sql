-- Create Gallery Posts Table
create table if not exists public.gallery_posts (
  id uuid default gen_random_uuid() primary key,
  image_url text not null,
  title text,
  description text,
  category_id uuid references public.service_categories(id),
  service_id uuid references public.services(id),
  width int,
  height int,
  created_at timestamptz default now(),
  is_active boolean default true
);

-- Create Gallery Likes Table
create table if not exists public.gallery_likes (
  id uuid default gen_random_uuid() primary key,
  user_id text not null, -- Storing Line User ID
  post_id uuid references public.gallery_posts(id) on delete cascade,
  created_at timestamptz default now(),
  unique(user_id, post_id)
);

-- Enable RLS
alter table public.gallery_posts enable row level security;
alter table public.gallery_likes enable row level security;

-- Policies (Simple for now)
create policy "Allow public read access" on public.gallery_posts for select using (true);
create policy "Allow authenticated upload" on public.gallery_posts for insert with check (auth.role() = 'authenticated');
create policy "Allow authenticated update" on public.gallery_posts for update using (auth.role() = 'authenticated');
create policy "Allow public read likes" on public.gallery_likes for select using (true);
create policy "Allow user to like" on public.gallery_likes for insert with check (true); -- Simplify for demo
create policy "Allow user to unlike" on public.gallery_likes for delete using (true); -- Simplify for demo
