-- Drop ALL existing policies on chats table by name
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'chats' AND schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.chats';
    END LOOP;
END $$;

-- Create simple INSERT policy for authenticated users
CREATE POLICY "allow_authenticated_insert_chats"
ON public.chats
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Create SELECT policy for chat members
CREATE POLICY "allow_select_member_chats"
ON public.chats
FOR SELECT
TO authenticated
USING (
  id IN (
    SELECT chat_id 
    FROM public.chat_members 
    WHERE user_id = auth.uid()
  )
);

-- Drop all policies on chat_members
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'chat_members' AND schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.chat_members';
    END LOOP;
END $$;

-- Allow authenticated users to add themselves to any chat
CREATE POLICY "allow_authenticated_insert_members"
ON public.chat_members
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow viewing chat members if you're a member
CREATE POLICY "allow_select_if_member"
ON public.chat_members
FOR SELECT
TO authenticated
USING (
  chat_id IN (
    SELECT chat_id 
    FROM public.chat_members 
    WHERE user_id = auth.uid()
  )
);