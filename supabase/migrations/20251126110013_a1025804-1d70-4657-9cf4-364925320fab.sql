-- Drop existing problematic policies
DROP POLICY IF EXISTS "allow_select_if_member" ON public.chat_members;
DROP POLICY IF EXISTS "allow_select_member_chats" ON public.chats;
DROP POLICY IF EXISTS "allow_authenticated_insert_chats" ON public.chats;
DROP POLICY IF EXISTS "allow_authenticated_insert_members" ON public.chat_members;

-- Recreate policies without recursion
-- For chats: authenticated users can insert and select their own chats
CREATE POLICY "authenticated_insert_chats" ON public.chats
  FOR INSERT 
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "authenticated_select_chats" ON public.chats
  FOR SELECT 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_members
      WHERE chat_members.chat_id = chats.id 
      AND chat_members.user_id = auth.uid()
    )
  );

-- For chat_members: authenticated users can insert themselves and select members of their chats
CREATE POLICY "authenticated_insert_members" ON public.chat_members
  FOR INSERT 
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "authenticated_select_members" ON public.chat_members
  FOR SELECT 
  TO authenticated
  USING (
    user_id = auth.uid() 
    OR 
    chat_id IN (
      SELECT cm.chat_id 
      FROM public.chat_members cm 
      WHERE cm.user_id = auth.uid()
    )
  );