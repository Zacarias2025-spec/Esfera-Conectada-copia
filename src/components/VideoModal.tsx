import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { convertToEmbed } from '@/lib/videoUtils';
import { AlertCircle } from 'lucide-react';

interface VideoModalProps {
  url: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function VideoModal({ url, isOpen, onClose }: VideoModalProps) {
  const { type, embedUrl } = convertToEmbed(url);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Vídeo</DialogTitle>
        </DialogHeader>
        
        {!embedUrl ? (
          <div className="flex items-center justify-center bg-muted rounded-lg p-8">
            <div className="text-center">
              <AlertCircle className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Não foi possível carregar o vídeo
              </p>
            </div>
          </div>
        ) : type === 'direct' ? (
          <video
            controls
            playsInline
            className="w-full rounded-lg"
            style={{ maxHeight: '70vh' }}
          >
            <source src={embedUrl} />
            Seu navegador não suporta o elemento de vídeo.
          </video>
        ) : (
          <div className="relative w-full overflow-hidden rounded-lg">
            <div className="relative pb-[56.25%]">
              <iframe
                src={embedUrl}
                className="absolute inset-0 w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                style={{ border: 0 }}
              />
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
