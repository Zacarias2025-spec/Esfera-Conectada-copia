import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import Header from '@/components/Layout/Header';
import PostCard from '@/components/Post/PostCard';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function Post() {
  const { postId } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (postId) {
      loadPost();
    }
  }, [postId]);

  const loadPost = async () => {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          profiles (*),
          post_media (*),
          likes (id, user_id),
          comments (
            id,
            content,
            created_at,
            author_id,
            profiles (*)
          )
        `)
        .eq('id', postId)
        .single();

      if (error) throw error;

      if (!data) {
        toast.error('Post não encontrado');
        navigate('/');
        return;
      }

      setPost(data);
    } catch (error) {
      console.error('Error loading post:', error);
      toast.error('Erro ao carregar publicação');
      navigate('/');
    } finally {
      setLoading(false);
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

  if (!post) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
        <Header />
        <main className="container max-w-4xl mx-auto py-6">
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">Post não encontrado</p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => navigate('/')}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar ao início
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <Header />
      
      <main className="container max-w-4xl mx-auto py-6">
        <Button 
          variant="ghost" 
          className="mb-4"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        
        <PostCard post={post} />
      </main>
    </div>
  );
}
