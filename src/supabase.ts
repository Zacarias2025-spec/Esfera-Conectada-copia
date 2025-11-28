import { supabase } from "@/integrations/supabase/client";

export { supabase };

export type Profile = {
  id: string;
  display_name: string;
  username: string;
  avatar_url?: string;
  bio?: string;
  location?: string;
  website?: string;
  phone?: string;
  followers_count: number;
  created_at: string;
  updated_at: string;
};

export type Post = {
  id: string;
  author_id: string;
  content_text?: string;
  video_link?: string;
  privacy: 'public' | 'private';
  created_at: string;
  updated_at: string;
};

export type PostMedia = {
  id: string;
  post_id: string;
  storage_path: string;
  media_type: 'image' | 'audio' | 'file';
  file_size?: number;
  created_at: string;
};

export type Comment = {
  id: string;
  post_id: string;
  author_id: string;
  content: string;
  created_at: string;
};

export type Like = {
  id: string;
  post_id: string;
  user_id: string;
  created_at: string;
};

export type Chat = {
  id: string;
  is_group: boolean;
  title?: string;
  created_at: string;
};

export type Message = {
  id: string;
  chat_id: string;
  author_id: string;
  content?: string;
  media_path?: string;
  media_type?: 'image' | 'audio' | 'file' | 'voice';
  duration?: number;
  read: boolean;
  created_at: string;
};

export type BlockedUser = {
  id: string;
  blocker_id: string;
  blocked_id: string;
  created_at: string;
};

export type Follow = {
  id: string;
  follower_id: string;
  followed_id: string;
  created_at: string;
};
