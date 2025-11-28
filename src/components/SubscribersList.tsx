import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2 } from 'lucide-react';

interface Subscriber {
  follower_id: string;
  profiles: {
    id: string;
    display_name: string;
    username: string;
    avatar_url: string | null;
  };
}

interface SubscribersListProps {
  userId: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function SubscribersList({ userId, isOpen, onClose }: SubscribersListProps) {
  const navigate = useNavigate();
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadSubscribers();
    }
  }, [isOpen, userId]);

  const loadSubscribers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('follows')
        .select(`
          follower_id,
          profiles!follows_follower_id_fkey (
            id,
            display_name,
            username,
            avatar_url
          )
        `)
        .eq('followed_id', userId);

      if (error) throw error;
      setSubscribers(data || []);
    } catch (error) {
      console.error('Error loading subscribers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubscriberClick = (subscriberId: string) => {
    onClose();
    navigate(`/profile/${subscriberId}`);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Assinantes</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[400px] pr-4">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : subscribers.length > 0 ? (
            <div className="space-y-2">
              {subscribers.map((subscriber) => (
                <div
                  key={subscriber.follower_id}
                  onClick={() => handleSubscriberClick(subscriber.follower_id)}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted cursor-pointer transition-colors"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage
                      src={subscriber.profiles.avatar_url || ''}
                      alt={subscriber.profiles.display_name}
                    />
                    <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground">
                      {subscriber.profiles.display_name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold">{subscriber.profiles.display_name}</p>
                    <p className="text-sm text-muted-foreground">@{subscriber.profiles.username}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              Nenhum assinante ainda
            </p>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
