-- Create RLS policy to allow users to create follower notifications
CREATE POLICY "Users can create follower notifications"
ON public.notifications
FOR INSERT
WITH CHECK (
  type = 'new_post' AND 
  EXISTS (
    SELECT 1 FROM public.follows
    WHERE follower_id = user_id
    AND followed_id = from_user_id
  )
);

-- Create function to notify followers when a post is created
CREATE OR REPLACE FUNCTION public.notify_followers_on_new_post()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Create notifications for all followers
  INSERT INTO public.notifications (user_id, type, post_id, from_user_id)
  SELECT follower_id, 'new_post', NEW.id, NEW.author_id
  FROM public.follows
  WHERE followed_id = NEW.author_id;
  
  RETURN NEW;
END;
$$;

-- Create trigger for new posts
CREATE TRIGGER on_post_created
AFTER INSERT ON public.posts
FOR EACH ROW
EXECUTE FUNCTION public.notify_followers_on_new_post();