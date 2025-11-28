import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import Header from '@/components/Layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Send, Loader2, ArrowLeft, Mic, Square, Paperclip, Trash2, Languages } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import { playEmojiSound } from '@/utils/emojiSounds';

export default function ChatRoom() {
  const { chatId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [otherUser, setOtherUser] = useState<any>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [translationLanguage, setTranslationLanguage] = useState<string>('none');
  const [translatedMessages, setTranslatedMessages] = useState<{ [key: string]: { text: string; original: string } }>({});
  const [translatingMessageId, setTranslatingMessageId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { isRecording, audioBlob, recordingTime, startRecording, stopRecording, resetRecording } = useAudioRecorder();

  useEffect(() => {
    if (chatId) {
      loadMessages();
      loadChatInfo();
      subscribeToMessages();
    }
  }, [chatId]);

  useEffect(() => {
    scrollToBottom();
    markMessagesAsRead();
  }, [messages]);

  useEffect(() => {
    // Handle shared content from ShareDialog
    if (location.state?.shareMessage) {
      setNewMessage(location.state.shareMessage);
      // Clear state to prevent re-setting
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state]);

  const markMessagesAsRead = async () => {
    if (!user || !chatId) return;

    const unreadMessages = messages.filter(
      msg => msg.author_id !== user.id && !msg.read
    );

    if (unreadMessages.length === 0) return;

    try {
      await supabase
        .from('messages')
        .update({ read: true })
        .in('id', unreadMessages.map(msg => msg.id));
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [newMessage]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadChatInfo = async () => {
    if (!chatId || !user) return;

    try {
      const { data: members } = await supabase
        .from('chat_members')
        .select('user_id, profiles(*)')
        .eq('chat_id', chatId);

      if (members) {
        const other = members.find(m => m.user_id !== user.id);
        if (other) {
          setOtherUser(other.profiles);
        }
      }
    } catch (error) {
      console.error('Error loading chat info:', error);
    }
  };

  const loadMessages = async () => {
    if (!chatId) return;

    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*, profiles(*)')
        .eq('chat_id', chatId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const subscribeToMessages = () => {
    const channel = supabase
      .channel(`chat:${chatId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `chat_id=eq.${chatId}`,
        },
        async (payload) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', payload.new.author_id)
            .single();

          setMessages((prev) => [...prev, { ...payload.new, profiles: profile }]);
          
          // Show notification if message is from another user
          if (payload.new.author_id !== user?.id) {
            toast.success(`Nova mensagem de ${profile?.display_name}`, {
              description: payload.new.content ? payload.new.content.substring(0, 50) + '...' : 'Arquivo anexado',
            });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `chat_id=eq.${chatId}`,
        },
        async (payload) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', payload.new.author_id)
            .single();

          setMessages((prev) => 
            prev.map(msg => msg.id === payload.new.id ? { ...payload.new, profiles: profile } : msg)
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    if (!newMessage.trim() && !audioBlob && !selectedFile) return;

    setSending(true);
    try {
      let mediaPath = null;
      let mediaType = null;

      if (audioBlob) {
        const fileName = `${user!.id}/${Date.now()}.webm`;
        const { error: uploadError } = await supabase.storage
          .from('media')
          .upload(fileName, audioBlob);

        if (uploadError) throw uploadError;

        mediaPath = fileName;
        mediaType = 'voice';
        resetRecording();
      } else if (selectedFile) {
        if (selectedFile.size > 5 * 1024 * 1024) {
          toast.error('Arquivo muito grande. Máximo 5MB');
          return;
        }

        const fileName = `${user!.id}/${Date.now()}_${selectedFile.name}`;
        const { error: uploadError } = await supabase.storage
          .from('media')
          .upload(fileName, selectedFile);

        if (uploadError) throw uploadError;

        mediaPath = fileName;
        mediaType = 'file';
        setSelectedFile(null);
      }

      const { error } = await supabase
        .from('messages')
        .insert({
          chat_id: chatId,
          author_id: user!.id,
          content: newMessage.trim() || null,
          media_path: mediaPath,
          media_type: mediaType,
        });

      if (error) throw error;

      setNewMessage('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      toast.error('Erro ao enviar mensagem');
    } finally {
      setSending(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Arquivo muito grande. Máximo 5MB');
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleRecordVoice = async () => {
    if (isRecording) {
      stopRecording();
    } else {
      try {
        await startRecording();
      } catch (error) {
        toast.error('Erro ao acessar microfone');
      }
    }
  };

  useEffect(() => {
    if (audioBlob) {
      handleSendMessage();
    }
  }, [audioBlob]);

  const translateMessage = async (messageId: string, content: string) => {
    if (translationLanguage === 'none' || !content) return;
    
    setTranslatingMessageId(messageId);
    
    try {
      const { data, error } = await supabase.functions.invoke('translate-text', {
        body: { text: content, targetLanguage: translationLanguage }
      });

      if (error) throw error;

      setTranslatedMessages(prev => ({
        ...prev,
        [messageId]: {
          text: data.translatedText,
          original: content
        }
      }));
    } catch (error) {
      console.error('Translation error:', error);
      toast.error('Erro ao traduzir mensagem');
    } finally {
      setTranslatingMessageId(null);
    }
  };

  const handleEmojiClick = (text: string) => {
    if (!text) return;
    const emojiRegex = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu;
    const emojis = text.match(emojiRegex);
    if (emojis && emojis.length > 0) {
      playEmojiSound(emojis[0]);
    }
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

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleDeleteMessage = async (messageId: string) => {
    try {
      const { error } = await supabase
        .from('messages')
        .delete()
        .eq('id', messageId);

      if (error) throw error;

      toast.success('Mensagem apagada');
      setMessages(prev => prev.filter(msg => msg.id !== messageId));
    } catch (error) {
      console.error('Error deleting message:', error);
      toast.error('Erro ao apagar mensagem');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <Header />
      
      <main className="container max-w-4xl mx-auto py-6">
        <Card className="shadow-lg h-[calc(100vh-200px)] flex flex-col">
          <CardHeader className="border-b space-y-3">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/chat')}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              {otherUser && (
                <>
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={otherUser.avatar_url} alt={otherUser.display_name} />
                    <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground">
                      {otherUser.display_name?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <CardTitle>{otherUser.display_name}</CardTitle>
                </>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Languages className="h-4 w-4 text-muted-foreground" />
              <Select value={translationLanguage} onValueChange={setTranslationLanguage}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Idioma" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem tradução</SelectItem>
                  <SelectItem value="Portuguese">Português</SelectItem>
                  <SelectItem value="English">Inglês</SelectItem>
                  <SelectItem value="Spanish">Espanhol</SelectItem>
                  <SelectItem value="French">Francês</SelectItem>
                  <SelectItem value="German">Alemão</SelectItem>
                  <SelectItem value="Italian">Italiano</SelectItem>
                  <SelectItem value="Chinese">Chinês</SelectItem>
                  <SelectItem value="Japanese">Japonês</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>

          <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((message) => {
              const isOwn = message.author_id === user?.id;
              const { data: mediaUrl } = message.media_path 
                ? supabase.storage.from('media').getPublicUrl(message.media_path)
                : { data: null };

              return (
                <div
                  key={message.id}
                  className={`flex gap-2 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}
                >
                   <Avatar 
                    className="h-8 w-8 mt-1 cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => navigate(`/profile/${message.profiles?.username}`)}
                  >
                    <AvatarImage src={message.profiles?.avatar_url} alt={message.profiles?.display_name} />
                    <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground text-sm">
                      {message.profiles?.display_name?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className={`flex flex-col max-w-[70%] ${isOwn ? 'items-end' : 'items-start'}`}>
                    <div className="relative group">
                      <div
                        className={`rounded-lg p-3 ${
                          isOwn
                            ? 'bg-gradient-to-r from-primary to-accent text-primary-foreground'
                            : 'bg-muted'
                        } break-words overflow-wrap-anywhere`}
                      >
                        {message.content && (
                          <div className="space-y-2">
                            <p 
                              className="whitespace-pre-wrap cursor-pointer"
                              onClick={() => handleEmojiClick(message.content)}
                            >
                              {(() => {
                                const content = translationLanguage !== 'none' && translatedMessages[message.id] 
                                  ? translatedMessages[message.id].text 
                                  : message.content;
                                
                                // Detect and make post links clickable
                                const postLinkRegex = new RegExp(`${window.location.origin}/post/([a-zA-Z0-9-]+)`, 'g');
                                const parts = content.split(postLinkRegex);
                                
                                if (parts.length > 1) {
                                  return parts.map((part, index) => {
                                    // Even indices are text, odd indices are post IDs
                                    if (index % 2 === 1) {
                                      return (
                                        <a 
                                          key={index}
                                          href={`/post/${part}`}
                                          className="underline font-semibold hover:opacity-80"
                                          onClick={(e) => {
                                            e.preventDefault();
                                            navigate(`/post/${part}`);
                                          }}
                                        >
                                          {`${window.location.origin}/post/${part}`}
                                        </a>
                                      );
                                    }
                                    return part;
                                  });
                                }
                                
                                return content;
                              })()}
                            </p>
                            {translationLanguage !== 'none' && message.content && !translatedMessages[message.id] && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 text-xs"
                                onClick={() => translateMessage(message.id, message.content)}
                                disabled={translatingMessageId === message.id}
                              >
                                {translatingMessageId === message.id ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <>
                                    <Languages className="h-3 w-3 mr-1" />
                                    Traduzir
                                  </>
                                )}
                              </Button>
                            )}
                            {translatedMessages[message.id] && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 text-xs"
                                onClick={() => {
                                  setTranslatedMessages(prev => {
                                    const updated = { ...prev };
                                    delete updated[message.id];
                                    return updated;
                                  });
                                }}
                              >
                                Ver original
                              </Button>
                            )}
                          </div>
                        )}
                        {message.media_type === 'voice' && mediaUrl && (
                          <audio src={mediaUrl.publicUrl} controls className="mt-2 max-w-full" />
                        )}
                        {message.media_type === 'file' && mediaUrl && (
                          <a 
                            href={mediaUrl.publicUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-sm underline mt-2 block"
                          >
                            📎 Arquivo anexado
                          </a>
                        )}
                      </div>
                      {isOwn && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="absolute -top-2 -right-10 opacity-0 group-hover:opacity-100 transition-opacity h-7 w-7"
                          onClick={() => handleDeleteMessage(message.id)}
                        >
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(message.created_at), {
                          addSuffix: true,
                          locale: ptBR,
                        })}
                      </span>
                      {isOwn && message.read && (
                        <span className="text-xs text-muted-foreground mt-1">✓✓</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </CardContent>

          <div className="border-t p-4">
            {selectedFile && (
              <div className="mb-2 text-sm text-muted-foreground flex items-center justify-between bg-muted/50 p-2 rounded">
                <span>📎 {selectedFile.name}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedFile(null)}
                >
                  ✕
                </Button>
              </div>
            )}
            <form onSubmit={handleSendMessage} className="flex gap-2 items-end">
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileSelect}
                className="hidden"
                accept="image/*,.pdf,.doc,.docx,.txt"
              />
              <Textarea
                ref={textareaRef}
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder={isRecording ? `Gravando... ${formatTime(recordingTime)}` : selectedFile ? "Adicione uma mensagem (opcional)" : "Digite sua mensagem..."}
                disabled={sending || isRecording}
                className="flex-1 min-h-[44px] max-h-[120px] resize-none overflow-y-auto"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                rows={1}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => fileInputRef.current?.click()}
                disabled={sending || isRecording}
              >
                <Paperclip className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant={isRecording ? "destructive" : "outline"}
                size="icon"
                onClick={handleRecordVoice}
                disabled={sending}
              >
                {isRecording ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </Button>
              <Button
                type="submit"
                disabled={sending || (!newMessage.trim() && !audioBlob && !selectedFile) || isRecording}
                className="bg-gradient-to-r from-primary to-accent"
              >
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </form>
          </div>
        </Card>
      </main>
    </div>
  );
}
