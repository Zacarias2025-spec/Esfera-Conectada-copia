import React from 'react';
import { convertToEmbed } from '@/lib/videoUtils';
import { AlertCircle } from 'lucide-react';

interface VideoPlayerProps {
  url: string;
  className?: string;
}

export default function VideoPlayer({ url, className = '' }: VideoPlayerProps) {
  const { type, embedUrl } = convertToEmbed(url);

  if (!embedUrl) {
    return (
      <div className={`flex items-center justify-center bg-muted rounded-lg p-8 ${className}`}>
        <div className="text-center">
          <AlertCircle className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Não foi possível carregar o vídeo
          </p>
        </div>
      </div>
    );
  }

  if (type === 'direct') {
    return (
      <video
        controls
        playsInline
        className={`w-full rounded-lg ${className}`}
        style={{ maxHeight: '500px' }}
      >
        <source src={embedUrl} />
        Seu navegador não suporta o elemento de vídeo.
      </video>
    );
  }

  return (
    <div className={`relative w-full overflow-hidden rounded-lg ${className}`}>
      <div className="relative pb-[56.25%]">
        <iframe
          src={embedUrl}
          className="absolute inset-0 w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          loading="lazy"
          style={{ border: 0 }}
        />
      </div>
    </div>
  );
}
