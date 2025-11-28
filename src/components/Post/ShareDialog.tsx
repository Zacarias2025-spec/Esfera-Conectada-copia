import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Share2, Copy, MessageCircle, Users } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

interface ShareDialogProps {
  postId: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function ShareDialog({ postId, isOpen, onClose }: ShareDialogProps) {
  const navigate = useNavigate();
  const baseUrl = 'https://esfera-conectada-02.vercel.app';
  const postUrl = `${baseUrl}/post/${postId}`;
  const inviteUrl = `${baseUrl}/auth`;
  const [copied, setCopied] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  const copyToClipboard = async (text: string, message: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success(message);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Erro ao copiar link');
    }
  };

  const shareToWhatsApp = () => {
    const text = encodeURIComponent(`Confira este post: ${postUrl}`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const shareToFacebook = () => {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(postUrl)}`, '_blank');
  };

  const shareToTwitter = () => {
    const text = encodeURIComponent('Confira este post!');
    window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(postUrl)}&text=${text}`, '_blank');
  };

  const shareInChat = async () => {
    setIsSharing(true);
    try {
      // Increment share count
      const { data: currentPost } = await supabase
        .from('posts')
        .select('share_count')
        .eq('id', postId)
        .single();
      
      if (currentPost) {
        await supabase
          .from('posts')
          .update({ share_count: (currentPost.share_count || 0) + 1 })
          .eq('id', postId);
      }
      
      onClose();
      navigate('/chat', { state: { shareUrl: postUrl, shareMessage: `Confira este post da Esfera Conectada: ${postUrl}` } });
    } catch (error) {
      console.error('Error sharing:', error);
      toast.error('Erro ao compartilhar');
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Compartilhar</DialogTitle>
          <DialogDescription>
            Compartilhe este post com seus amigos ou em outras redes sociais
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Link do Post */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Link do Post</label>
            <div className="flex gap-2">
              <Input
                value={postUrl}
                readOnly
                className="flex-1"
              />
              <Button
                size="icon"
                variant="outline"
                onClick={() => copyToClipboard(postUrl, 'Link copiado!')}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Compartilhar em Redes Sociais */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Compartilhar em:</label>
            <div className="grid grid-cols-3 gap-2">
              <Button
                variant="outline"
                className="flex flex-col h-auto py-3"
                onClick={shareToWhatsApp}
              >
                <svg className="h-6 w-6 mb-1" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                </svg>
                <span className="text-xs">WhatsApp</span>
              </Button>

              <Button
                variant="outline"
                className="flex flex-col h-auto py-3"
                onClick={shareToFacebook}
              >
                <svg className="h-6 w-6 mb-1" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
                <span className="text-xs">Facebook</span>
              </Button>

              <Button
                variant="outline"
                className="flex flex-col h-auto py-3"
                onClick={shareToTwitter}
              >
                <svg className="h-6 w-6 mb-1" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                </svg>
                <span className="text-xs">Twitter</span>
              </Button>
            </div>
          </div>

          {/* Compartilhar no Chat */}
          <Button
            variant="outline"
            className="w-full"
            onClick={shareInChat}
            disabled={isSharing}
          >
            <MessageCircle className="h-4 w-4 mr-2" />
            {isSharing ? 'Compartilhando...' : 'Compartilhar no Chat'}
          </Button>

          {/* Convidar Novos Membros */}
          <div className="space-y-2 pt-4 border-t">
            <label className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4" />
              Convidar novos membros
            </label>
            <p className="text-xs text-muted-foreground">
              Compartilhe a Esfera Conectada e convide novos membros para nossa comunidade!
            </p>
            <div className="flex gap-2">
              <Input
                value={inviteUrl}
                readOnly
                className="flex-1"
              />
              <Button
                size="icon"
                variant="outline"
                onClick={() => copyToClipboard(inviteUrl, 'Link de convite copiado!')}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
