import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase, type Post, type Profile } from '@/lib/supabase';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Heart, MessageCircle, Share2, Trash2, Play, Edit, Languages, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import VideoModal from '@/components/VideoModal';
import CommentSection from './CommentSection';
import EditPostDialog from './EditPostDialog';
import ShareDialog from './ShareDialog';
import { toast } from 'sonner';
import { convertToEmbed } from '@/lib/videoUtils';

interface PostCardProps {
  post: Post;
  onDeleted?: () => void;
}

export default function PostCard({ post, onDeleted }: PostCardProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [media, setMedia] = useState<any[]>([]);
  const [likes, setLikes] = useState<number>(0);
  const [isLiked, setIsLiked] = useState(false);
  const [comments, setComments] = useState<number>(0);
  const [showComments, setShowComments] = useState(false);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [translatedText, setTranslatedText] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [shareCount, setShareCount] = useState(0);
  const [viewCount, setViewCount] = useState(0);

  useEffect(() => {
    loadPostData();
    incrementViewCount();
  }, [post.id]);

  const loadPostData = async () => {
    // Load author profile
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', post.author_id)
      .single();
    
    if (profileData) setProfile(profileData);

    // Load media
    const { data: mediaData } = await supabase
      .from('post_media')
      .select('*')
      .eq('post_id', post.id);
    
    if (mediaData) setMedia(mediaData);

    // Load likes count
    const { count: likesCount } = await supabase
      .from('likes')
      .select('*', { count: 'exact', head: true })
      .eq('post_id', post.id);
    
    setLikes(likesCount || 0);

    // Check if user liked
    if (user) {
      const { data: userLike } = await supabase
        .from('likes')
        .select('id')
        .eq('post_id', post.id)
        .eq('user_id', user.id)
        .single();
      
      setIsLiked(!!userLike);
    }

    // Load comments count
    const { count: commentsCount } = await supabase
      .from('comments')
      .select('*', { count: 'exact', head: true })
      .eq('post_id', post.id);
    
    setComments(commentsCount || 0);

    // Load share and view counts
    const { data: postData } = await supabase
      .from('posts')
      .select('share_count, view_count')
      .eq('id', post.id)
      .single();
    
    if (postData) {
      setShareCount(postData.share_count || 0);
      setViewCount(postData.view_count || 0);
    }
  };

  const incrementViewCount = async () => {
    try {
      const { data: currentPost } = await supabase
        .from('posts')
        .select('view_count')
        .eq('id', post.id)
        .single();
      
      if (currentPost) {
        await supabase
          .from('posts')
          .update({ view_count: (currentPost.view_count || 0) + 1 })
          .eq('id', post.id);
      }
    } catch (error) {
      console.error('Error incrementing view count:', error);
    }
  };

  const handleLike = async () => {
    if (!user) return;

    try {
      if (isLiked) {
        await supabase
          .from('likes')
          .delete()
          .eq('post_id', post.id)
          .eq('user_id', user.id);
        
        setLikes(likes - 1);
        setIsLiked(false);
      } else {
        await supabase
          .from('likes')
          .insert({ post_id: post.id, user_id: user.id });
        
        setLikes(likes + 1);
        setIsLiked(true);
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      toast.error('Erro ao curtir post');
    }
  };

  const handleDelete = async () => {
    if (!user || user.id !== post.author_id) return;

    try {
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', post.id);

      if (error) throw error;

      toast.success('Post deletado com sucesso');
      if (onDeleted) onDeleted();
    } catch (error) {
      console.error('Error deleting post:', error);
      toast.error('Erro ao deletar post');
    }
  };

  const getMediaUrl = (storagePath: string) => {
    const { data } = supabase.storage.from('media').getPublicUrl(storagePath);
    return data.publicUrl;
  };

  const handleTranslate = async () => {
    if (!post.content_text) return;
    
    if (translatedText) {
      setTranslatedText(null);
      return;
    }

    setIsTranslating(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('translate-text', {
        body: { text: post.content_text, targetLanguage: 'Portuguese' }
      });

      if (error) throw error;

      setTranslatedText(data.translatedText);
    } catch (error) {
      console.error('Translation error:', error);
      toast.error('Erro ao traduzir post');
    } finally {
      setIsTranslating(false);
    }
  };

  return (
    <Card className="shadow-md hover:shadow-lg transition-shadow">
      <CardHeader className="flex flex-row items-center gap-3">
        <Avatar 
          className="h-10 w-10 cursor-pointer" 
          onClick={() => navigate(`/profile/${post.author_id}`)}
        >
          <AvatarImage src={profile?.avatar_url || ''} alt={profile?.display_name} />
          <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground">
            {profile?.display_name?.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <p 
            className="font-semibold cursor-pointer hover:underline"
            onClick={() => navigate(`/profile/${post.author_id}`)}
          >
            {profile?.display_name}
          </p>
          <p className="text-sm text-muted-foreground">
            @{profile?.username} · {formatDistanceToNow(new Date(post.created_at), { 
              addSuffix: true, 
              locale: ptBR 
            })}
          </p>
        </div>
        {user?.id === post.author_id && (
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" onClick={() => setShowEditDialog(true)}>
              <Edit className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleDelete} className="text-destructive">
              <Trash2 className="h-5 w-5" />
            </Button>
          </div>
        )}
      </CardHeader>
      
      <CardContent className="space-y-4">
        {post.content_text && (
          <div className="space-y-2">
            <p className="whitespace-pre-wrap">{translatedText || post.content_text}</p>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleTranslate}
              disabled={isTranslating}
              className="h-7 text-xs"
            >
              {isTranslating ? (
                <Loader2 className="h-3 w-3 animate-spin mr-1" />
              ) : (
                <Languages className="h-3 w-3 mr-1" />
              )}
              {translatedText ? 'Ver original' : 'Traduzir'}
            </Button>
          </div>
        )}

        {media.length > 0 && (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              {media.filter(m => m.media_type === 'image').map((item) => (
                <img
                  key={item.id}
                  src={getMediaUrl(item.storage_path)}
                  alt="Post media"
                  className="w-full rounded-lg object-cover h-48"
                />
              ))}
            </div>
            {media.filter(m => m.media_type === 'audio').map((item) => (
              <audio
                key={item.id}
                src={getMediaUrl(item.storage_path)}
                controls
                className="w-full"
              />
            ))}
          </div>
        )}

        {post.video_link && (() => {
          const { thumbnailUrl } = convertToEmbed(post.video_link);
          return (
            <div className="relative cursor-pointer group rounded-lg overflow-hidden" onClick={() => setShowVideoModal(true)}>
              {thumbnailUrl ? (
                <div className="relative">
                  <img 
                    src={thumbnailUrl} 
                    alt="Video thumbnail"
                    className="w-full h-auto object-cover rounded-lg"
                  />
                  <div className="absolute inset-0 bg-black/30 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                    <div className="w-16 h-16 rounded-full bg-primary/90 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Play className="w-8 h-8 text-primary-foreground ml-1" fill="currentColor" />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="relative pb-[56.25%] bg-muted rounded-lg overflow-hidden">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="bg-primary/90 rounded-full p-4 group-hover:scale-110 transition-transform">
                      <Play className="h-8 w-8 text-primary-foreground fill-current" />
                    </div>
                  </div>
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-2 text-center">
                Clique para assistir o vídeo
              </p>
            </div>
          );
        })()}

        <div className="flex items-center gap-4 pt-2 border-t">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLike}
            className={isLiked ? 'text-accent' : ''}
          >
            <Heart className={`h-5 w-5 mr-1 ${isLiked ? 'fill-current' : ''}`} />
            {likes}
          </Button>
          
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setShowComments(!showComments)}
          >
            <MessageCircle className="h-5 w-5 mr-1" />
            {comments}
          </Button>
          
          <Button variant="ghost" size="sm" onClick={() => setShowShareDialog(true)}>
            <Share2 className="h-5 w-5 mr-1" />
            {shareCount > 0 && shareCount}
          </Button>
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {viewCount > 0 && (
            <span>{viewCount} {viewCount === 1 ? 'visualização' : 'visualizações'}</span>
          )}
        </div>

        <CommentSection postId={post.id} isOpen={showComments} />
      </CardContent>

      {post.video_link && (
        <VideoModal 
          url={post.video_link} 
          isOpen={showVideoModal} 
          onClose={() => setShowVideoModal(false)} 
        />
      )}

      {post.content_text && (
        <EditPostDialog
          postId={post.id}
          currentContent={post.content_text}
          isOpen={showEditDialog}
          onClose={() => setShowEditDialog(false)}
          onSuccess={loadPostData}
        />
      )}

      <ShareDialog
        postId={post.id}
        isOpen={showShareDialog}
        onClose={() => {
          setShowShareDialog(false);
          loadPostData(); // Reload to update share count
        }}
      />
    </Card>
  );
}
