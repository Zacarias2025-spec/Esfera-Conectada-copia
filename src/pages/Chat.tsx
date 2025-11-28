import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import Header from '@/components/Layout/Header';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MessageCircle, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

export default function Chat() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [chats, setChats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadChats();
      subscribeToChats();
    }
  }, [user]);

  useEffect(() => {
    // Handle shared content from ShareDialog
    if (location.state?.shareMessage && location.state?.shareUrl) {
      // The user wants to share a post, so we keep the chat list visible
      // They can click on any chat to share the message
      toast.success('Selecione um chat para compartilhar');
    }
  }, [location.state]);

  const loadChats = async () => {
    if (!user) return;

    try {
      const { data: memberChats, error } = await supabase
        .from('chat_members')
        .select('chat_id, chats(*)')
        .eq('user_id', user.id);

      if (error) throw error;

      if (memberChats) {
        const chatsWithDetails = await Promise.all(
          memberChats.map(async (mc) => {
            // Get last message
            const { data: lastMessage } = await supabase
              .from('messages')
              .select('*')
              .eq('chat_id', mc.chat_id)
              .order('created_at', { ascending: false })
              .limit(1)
              .single();

            // Get other user
            const { data: members } = await supabase
              .from('chat_members')
              .select('user_id, profiles(*)')
              .eq('chat_id', mc.chat_id)
              .neq('user_id', user.id);

            return {
              ...mc.chats,
              lastMessage,
              otherUser: members?.[0]?.profiles,
            };
          })
        );

        setChats(chatsWithDetails.sort((a, b) => {
          const dateA = a.lastMessage?.created_at || a.created_at;
          const dateB = b.lastMessage?.created_at || b.created_at;
          return new Date(dateB).getTime() - new Date(dateA).getTime();
        }));
      }
    } catch (error) {
      console.error('Error loading chats:', error);
    } finally {
      setLoading(false);
    }
  };

  const subscribeToChats = () => {
    const channel = supabase
      .channel('chats-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
        },
        () => {
          loadChats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
        <Header />
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <Header />
      
      <main className="container max-w-4xl mx-auto py-6">
        {chats.length === 0 ? (
          <Card className="shadow-lg">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <MessageCircle className="h-16 w-16 text-muted-foreground mb-4" />
              <h2 className="text-2xl font-semibold mb-2">Chat em tempo real</h2>
              <p className="text-muted-foreground text-center max-w-md">
                Você ainda não tem conversas. Comece enviando uma mensagem para um usuário!
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {chats.map((chat) => (
              <Card
                key={chat.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => {
                  // Pass shared content to ChatRoom if exists
                  if (location.state?.shareMessage) {
                    navigate(`/chat/${chat.id}`, { 
                      state: { 
                        shareMessage: location.state.shareMessage,
                        shareUrl: location.state.shareUrl 
                      } 
                    });
                  } else {
                    navigate(`/chat/${chat.id}`);
                  }
                }}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={chat.otherUser?.avatar_url} alt={chat.otherUser?.display_name} />
                      <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground">
                        {chat.otherUser?.display_name?.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="font-semibold">{chat.otherUser?.display_name}</p>
                        {chat.lastMessage && (
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(chat.lastMessage.created_at), {
                              addSuffix: true,
                              locale: ptBR,
                            })}
                          </span>
                        )}
                      </div>
                      {chat.lastMessage && (
                        <p className="text-sm text-muted-foreground truncate">
                          {chat.lastMessage.content || '🎤 Mensagem de voz'}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
