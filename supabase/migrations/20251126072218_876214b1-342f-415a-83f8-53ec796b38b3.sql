-- ==========================================
-- CORREÇÃO DAS POLICIES DO CHAT
-- Remove recursão infinita usando security definer function
-- ==========================================

-- 1. Remover todas as policies antigas que causam recursão
DROP POLICY IF EXISTS "Chat members can view members of their chats" ON public.chat_members;
DROP POLICY IF EXISTS "Users can join chats" ON public.chat_members;
DROP POLICY IF EXISTS "Chat members can send messages" ON public.messages;
DROP POLICY IF EXISTS "Chat members can view messages" ON public.messages;

-- 2. Criar função security definer para verificar se usuário é membro do chat
CREATE OR REPLACE FUNCTION public.is_chat_member(_user_id uuid, _chat_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.chat_members
    WHERE user_id = _user_id
      AND chat_id = _chat_id
  )
$$;

-- 3. Criar policies corretas sem recursão

-- Policy para visualizar membros do chat (SELECT)
CREATE POLICY "Users can view chat members if they are members"
ON public.chat_members
FOR SELECT
TO authenticated
USING (public.is_chat_member(auth.uid(), chat_id));

-- Policy para adicionar membros ao chat (INSERT)
CREATE POLICY "Users can join chats"
ON public.chat_members
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Policy para visualizar mensagens (SELECT)
CREATE POLICY "Chat members can view messages"
ON public.messages
FOR SELECT
TO authenticated
USING (public.is_chat_member(auth.uid(), chat_id));

-- Policy para enviar mensagens (INSERT)
CREATE POLICY "Chat members can send messages"
ON public.messages
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = author_id 
  AND public.is_chat_member(auth.uid(), chat_id)
);

-- ==========================================
-- ADICIONAR TABELA DE NOTIFICAÇÕES
-- ==========================================

CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL, -- 'like', 'comment', 'message'
  post_id uuid REFERENCES public.posts(id) ON DELETE CASCADE,
  comment_id uuid REFERENCES public.comments(id) ON DELETE CASCADE,
  from_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  read boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Policy para visualizar próprias notificações
CREATE POLICY "Users can view their own notifications"
ON public.notifications
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Policy para marcar notificações como lidas
CREATE POLICY "Users can update their own notifications"
ON public.notifications
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- ==========================================
-- TRIGGERS PARA CRIAR NOTIFICAÇÕES
-- ==========================================

-- Função para criar notificação de curtida
CREATE OR REPLACE FUNCTION public.create_like_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  post_author_id uuid;
BEGIN
  -- Pegar o autor do post
  SELECT author_id INTO post_author_id
  FROM public.posts
  WHERE id = NEW.post_id;
  
  -- Criar notificação apenas se não for o próprio autor curtindo
  IF post_author_id != NEW.user_id THEN
    INSERT INTO public.notifications (user_id, type, post_id, from_user_id)
    VALUES (post_author_id, 'like', NEW.post_id, NEW.user_id);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger para curtidas
DROP TRIGGER IF EXISTS on_like_created ON public.likes;
CREATE TRIGGER on_like_created
  AFTER INSERT ON public.likes
  FOR EACH ROW
  EXECUTE FUNCTION public.create_like_notification();

-- Função para criar notificação de comentário
CREATE OR REPLACE FUNCTION public.create_comment_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  post_author_id uuid;
BEGIN
  -- Pegar o autor do post
  SELECT author_id INTO post_author_id
  FROM public.posts
  WHERE id = NEW.post_id;
  
  -- Criar notificação apenas se não for o próprio autor comentando
  IF post_author_id != NEW.author_id THEN
    INSERT INTO public.notifications (user_id, type, post_id, comment_id, from_user_id)
    VALUES (post_author_id, 'comment', NEW.post_id, NEW.id, NEW.author_id);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger para comentários
DROP TRIGGER IF EXISTS on_comment_created ON public.comments;
CREATE TRIGGER on_comment_created
  AFTER INSERT ON public.comments
  FOR EACH ROW
  EXECUTE FUNCTION public.create_comment_notification();