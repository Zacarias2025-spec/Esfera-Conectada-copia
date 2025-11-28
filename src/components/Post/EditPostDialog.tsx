import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface EditPostDialogProps {
  postId: string;
  currentContent: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditPostDialog({
  postId,
  currentContent,
  isOpen,
  onClose,
  onSuccess,
}: EditPostDialogProps) {
  const [content, setContent] = useState(currentContent);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!content.trim()) {
      toast.error('O post não pode estar vazio');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('posts')
        .update({ content_text: content.trim() })
        .eq('id', postId);

      if (error) throw error;

      toast.success('Post atualizado com sucesso');
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error updating post:', error);
      toast.error('Erro ao atualizar post');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Editar Post</DialogTitle>
        </DialogHeader>
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="O que você está pensando?"
          className="min-h-[150px] resize-none"
        />
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              'Salvar'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
