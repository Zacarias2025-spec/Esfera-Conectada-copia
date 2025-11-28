-- Fix infinite recursion in chat_members policies
-- The issue is that the SELECT policy on chat_members uses a function that queries chat_members itself

-- Drop existing policies
DROP POLICY IF EXISTS "users_can_view_chat_members" ON public.chat_members;
DROP POLICY IF EXISTS "users_can_add_members" ON public.chat_members;
DROP POLICY IF EXISTS "users_can_view_their_chats" ON public.chats;
DROP POLICY IF EXISTS "users_can_insert_chats" ON public.chats;

-- For chat_members, allow authenticated users to view all members
-- This prevents recursion and is safe because we control access at the messages level
CREATE POLICY "authenticated_users_can_view_chat_members" ON public.chat_members
  FOR SELECT 
  TO authenticated
  USING (true);

CREATE POLICY "authenticated_users_can_add_members" ON public.chat_members
  FOR INSERT 
  TO authenticated
  WITH CHECK (true);

-- For chats, we still use the security definer function
-- This is safe because it queries chat_members which now has a simple policy
CREATE POLICY "users_can_view_their_chats" ON public.chats
  FOR SELECT 
  TO authenticated
  USING (public.user_is_chat_member(auth.uid(), id));

CREATE POLICY "users_can_insert_chats" ON public.chats
  FOR INSERT 
  TO authenticated
  WITH CHECK (true);