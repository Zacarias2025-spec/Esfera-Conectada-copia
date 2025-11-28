-- Drop all existing policies
DROP POLICY IF EXISTS "authenticated_select_members" ON public.chat_members;
DROP POLICY IF EXISTS "authenticated_insert_members" ON public.chat_members;
DROP POLICY IF EXISTS "authenticated_select_chats" ON public.chats;
DROP POLICY IF EXISTS "authenticated_insert_chats" ON public.chats;

-- Create security definer function to check if user is chat member
CREATE OR REPLACE FUNCTION public.user_is_chat_member(user_id uuid, chat_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.chat_members
    WHERE chat_members.user_id = user_id
    AND chat_members.chat_id = chat_id
  );
$$;

-- Simple policies using the security definer function
CREATE POLICY "users_can_insert_chats" ON public.chats
  FOR INSERT 
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "users_can_view_their_chats" ON public.chats
  FOR SELECT 
  TO authenticated
  USING (public.user_is_chat_member(auth.uid(), id));

CREATE POLICY "users_can_add_members" ON public.chat_members
  FOR INSERT 
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "users_can_view_chat_members" ON public.chat_members
  FOR SELECT 
  TO authenticated
  USING (public.user_is_chat_member(auth.uid(), chat_id));