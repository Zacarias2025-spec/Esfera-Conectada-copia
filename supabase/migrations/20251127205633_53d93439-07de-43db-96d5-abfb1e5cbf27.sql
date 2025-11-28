-- Add share_count and view_count to posts table
ALTER TABLE public.posts 
ADD COLUMN IF NOT EXISTS share_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS view_count integer DEFAULT 0;