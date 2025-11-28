-- Criar tabela de follows (sistema de assinatura/seguidores)
CREATE TABLE public.follows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  followed_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  UNIQUE(follower_id, followed_id),
  CHECK (follower_id != followed_id)
);

ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para follows
CREATE POLICY "Users can view all follows" ON public.follows
  FOR SELECT 
  TO authenticated
  USING (true);

CREATE POLICY "Users can follow others" ON public.follows
  FOR INSERT 
  TO authenticated
  WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can unfollow" ON public.follows
  FOR DELETE 
  TO authenticated
  USING (auth.uid() = follower_id);

-- Adicionar campo read às mensagens
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS read boolean DEFAULT false;

-- Política para permitir deletar próprias mensagens
CREATE POLICY "Users can delete their own messages" ON public.messages
  FOR DELETE 
  TO authenticated
  USING (auth.uid() = author_id);

-- Política para marcar mensagens como lidas
CREATE POLICY "Chat members can update message read status" ON public.messages
  FOR UPDATE 
  TO authenticated
  USING (is_chat_member(auth.uid(), chat_id))
  WITH CHECK (is_chat_member(auth.uid(), chat_id));

-- Adicionar contador de seguidores aos profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS followers_count integer DEFAULT 0;

-- Função para atualizar contador de seguidores
CREATE OR REPLACE FUNCTION public.update_followers_count()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.profiles 
    SET followers_count = followers_count + 1 
    WHERE id = NEW.followed_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.profiles 
    SET followers_count = GREATEST(followers_count - 1, 0) 
    WHERE id = OLD.followed_id;
  END IF;
  RETURN NULL;
END;
$$;

-- Trigger para atualizar contador
DROP TRIGGER IF EXISTS update_followers_count_trigger ON public.follows;
CREATE TRIGGER update_followers_count_trigger
AFTER INSERT OR DELETE ON public.follows
FOR EACH ROW EXECUTE FUNCTION public.update_followers_count();

-- Habilitar realtime para follows
ALTER PUBLICATION supabase_realtime ADD TABLE public.follows;