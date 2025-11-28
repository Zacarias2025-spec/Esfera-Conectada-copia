import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Send, Loader2, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

interface Comment {
  id: string;
  content: string;
  author_id: string;
  created_at: string;
  profiles: {
    display_name: string;
    username: string;
    avatar_url: string | null;
  };
}

interface CommentSectionProps {
  postId: string;
  isOpen: boolean;
}

export default function CommentSection({ postId, isOpen }: CommentSectionProps) {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadComments();
      subscribeToComments();
    }
  }, [postId, isOpen]);

  const loadComments = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('comments')
        .select('*, profiles(*)')
        .eq('post_id', postId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setComments(data || []);
    } catch (error) {
      console.error('Error loading comments:', error);
    } finally {
      setLoading(false);
    }
  };

  const subscribeToComments = () => {
    const channel = supabase
      .channel(`comments:${postId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'comments',
          filter: `post_id=eq.${postId}`,
        },
        () => {
          loadComments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !user) return;

    setSubmitting(true);
    try {
      // Insert comment
      const { data: commentData, error } = await supabase
        .from('comments')
        .insert({
          post_id: postId,
          author_id: user.id,
          content: newComment.trim(),
        })
        .select()
        .single();

      if (error) throw error;

      // Check for mentions (@username)
      const mentionRegex = /@(\w+)/g;
      const mentions = newComment.match(mentionRegex);
      
      if (mentions && commentData) {
        const usernames = mentions.map(m => m.substring(1));
        
        // Get mentioned users
        const { data: mentionedUsers } = await supabase
          .from('profiles')
          .select('id')
          .in('username', usernames);

        if (mentionedUsers) {
          // Create notifications for mentioned users
          const notifications = mentionedUsers
            .filter(u => u.id !== user.id) // Don't notify yourself
            .map(u => ({
              user_id: u.id,
              type: 'mention',
              post_id: postId,
              comment_id: commentData.id,
              from_user_id: user.id,
            }));

          if (notifications.length > 0) {
            await supabase
              .from('notifications')
              .insert(notifications);
          }
        }
      }

      setNewComment('');
      toast.success('Comentário adicionado');
    } catch (error) {
      console.error('Error adding comment:', error);
      toast.error('Erro ao adicionar comentário');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    try {
      const { error } = await supabase
        .from('comments')
        .delete()
        .eq('id', commentId);

      if (error) throw error;
      toast.success('Comentário deletado');
    } catch (error) {
      console.error('Error deleting comment:', error);
      toast.error('Erro ao deletar comentário');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="space-y-4 pt-4 border-t">
      {loading ? (
        <div className="flex justify-center py-4">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : comments.length > 0 ? (
        <div className="space-y-3 max-h-60 overflow-y-auto">
          {comments.map((comment) => (
            <div key={comment.id} className="flex gap-2">
              <Avatar className="h-8 w-8 mt-1">
                <AvatarImage src={comment.profiles.avatar_url || ''} alt={comment.profiles.display_name} />
                <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground text-xs">
                  {comment.profiles.display_name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 bg-muted rounded-lg p-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-sm">{comment.profiles.display_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(comment.created_at), {
                        addSuffix: true,
                        locale: ptBR,
                      })}
                    </p>
                  </div>
                  {user?.id === comment.author_id && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(comment.id)}
                      className="h-6 w-6 p-0"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
                <p className="text-sm mt-1 break-words whitespace-pre-wrap">
                  {comment.content.split(/(@\w+)/g).map((part, i) => 
                    part.startsWith('@') ? (
                      <span key={i} className="text-primary font-semibold">{part}</span>
                    ) : (
                      <span key={i}>{part}</span>
                    )
                  )}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-center text-sm text-muted-foreground py-4">
          Nenhum comentário ainda. Seja o primeiro!
        </p>
      )}

      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Escreva um comentário..."
          disabled={submitting}
          className="flex-1"
        />
        <Button
          type="submit"
          size="icon"
          disabled={submitting || !newComment.trim()}
          className="bg-gradient-to-r from-primary to-accent"
        >
          {submitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </form>
    </div>
  );
}
