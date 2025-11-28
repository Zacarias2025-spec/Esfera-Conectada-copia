-- Fix the RLS policy for chats table to allow INSERT
-- The current policy checks for chat membership, but when creating a chat there are no members yet
DROP POLICY IF EXISTS "Users can create chats" ON public.chats;

CREATE POLICY "Users can create chats" 
ON public.chats 
FOR INSERT 
TO authenticated
WITH CHECK (true);