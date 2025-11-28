import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Image, Video, Loader2, X, Mic, Upload } from 'lucide-react';
import AudioRecorder from './AudioRecorder';

export default function CreatePost({ onPostCreated }: { onPostCreated?: () => void }) {
  const { user } = useAuth();
  const [content, setContent] = useState('');
  const [videoLink, setVideoLink] = useState('');
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [selectedAudio, setSelectedAudio] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showVideoInput, setShowVideoInput] = useState(false);
  const [showAudioRecorder, setShowAudioRecorder] = useState(false);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setSelectedImages([...selectedImages, ...files]);
    }
  };

  const removeImage = (index: number) => {
    setSelectedImages(selectedImages.filter((_, i) => i !== index));
  };

  const handleAudioSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 2 * 1024 * 1024) {
        toast.error('Áudio deve ter no máximo 2MB');
        return;
      }
      setSelectedAudio(file);
    }
  };

  const handleAudioRecorded = (blob: Blob) => {
    const file = new File([blob], 'recording.webm', { type: 'audio/webm' });
    setSelectedAudio(file);
    setShowAudioRecorder(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!content.trim() && !videoLink.trim() && selectedImages.length === 0 && !selectedAudio) {
      toast.error('Adicione algum conteúdo ao seu post');
      return;
    }

    setIsSubmitting(true);

    try {
      // Create post
      const { data: post, error: postError } = await supabase
        .from('posts')
        .insert({
          author_id: user!.id,
          content_text: content.trim() || null,
          video_link: videoLink.trim() || null,
          privacy: 'public',
        })
        .select()
        .single();

      if (postError) throw postError;

      // Upload images
      if (selectedImages.length > 0) {
        for (const image of selectedImages) {
          const fileExt = image.name.split('.').pop();
          const fileName = `${user!.id}/${Date.now()}.${fileExt}`;

          const { error: uploadError } = await supabase.storage
            .from('media')
            .upload(fileName, image);

          if (uploadError) throw uploadError;

          const { error: mediaError } = await supabase
            .from('post_media')
            .insert({
              post_id: post.id,
              storage_path: fileName,
              media_type: 'image',
              file_size: image.size,
            });

          if (mediaError) throw mediaError;
        }
      }

      // Upload audio
      if (selectedAudio) {
        const fileExt = selectedAudio.name.split('.').pop();
        const fileName = `${user!.id}/${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('media')
          .upload(fileName, selectedAudio);

        if (uploadError) throw uploadError;

        const { error: mediaError } = await supabase
          .from('post_media')
          .insert({
            post_id: post.id,
            storage_path: fileName,
            media_type: 'audio',
            file_size: selectedAudio.size,
          });

        if (mediaError) throw mediaError;
      }

      toast.success('Post criado com sucesso!');
      setContent('');
      setVideoLink('');
      setSelectedImages([]);
      setSelectedAudio(null);
      setShowVideoInput(false);
      setShowAudioRecorder(false);
      
      if (onPostCreated) {
        onPostCreated();
      }
    } catch (error: any) {
      console.error('Error creating post:', error);
      toast.error('Erro ao criar post');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="shadow-md">
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Textarea
            placeholder="O que você está pensando?"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="min-h-[100px] resize-none"
          />

          {showVideoInput && (
            <div className="space-y-2">
              <Label htmlFor="video-link">Link do vídeo</Label>
              <Input
                id="video-link"
                type="url"
                placeholder="Cole o link do YouTube, TikTok, Facebook..."
                value={videoLink}
                onChange={(e) => setVideoLink(e.target.value)}
              />
            </div>
          )}

          {selectedImages.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {selectedImages.map((image, index) => (
                <div key={index} className="relative group">
                  <img
                    src={URL.createObjectURL(image)}
                    alt="Preview"
                    className="w-full h-24 object-cover rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {selectedAudio && !showAudioRecorder && (
            <div className="flex items-center gap-2 p-2 border rounded-lg">
              <audio src={URL.createObjectURL(selectedAudio)} controls className="flex-1" />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setSelectedAudio(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          {showAudioRecorder && (
            <AudioRecorder
              onAudioReady={handleAudioRecorded}
              onCancel={() => setShowAudioRecorder(false)}
            />
          )}

          <div className="flex flex-col gap-3 pt-2 border-t">
            <div className="flex items-center gap-2 overflow-x-auto pb-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => document.getElementById('image-upload')?.click()}
                className="flex-shrink-0"
              >
                <Image className="h-5 w-5 mr-1" />
                Foto
              </Button>
              <input
                id="image-upload"
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleImageSelect}
              />
              
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowVideoInput(!showVideoInput)}
                className="flex-shrink-0"
              >
                <Video className="h-5 w-5 mr-1" />
                Vídeo
              </Button>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowAudioRecorder(!showAudioRecorder)}
                disabled={!!selectedAudio}
                className="flex-shrink-0"
              >
                <Mic className="h-5 w-5 mr-1" />
                Gravar
              </Button>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => document.getElementById('audio-upload')?.click()}
                disabled={!!selectedAudio}
                className="flex-shrink-0"
              >
                <Upload className="h-5 w-5 mr-1" />
                Áudio
              </Button>
              <input
                id="audio-upload"
                type="file"
                accept="audio/*"
                className="hidden"
                onChange={handleAudioSelect}
              />
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Publicando...
                </>
              ) : (
                'Publicar'
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
