import { useEffect, useState, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase, type Post } from '@/lib/supabase';
import CreatePost from '@/components/Post/CreatePost';
import PostCard from '@/components/Post/PostCard';
import Header from '@/components/Layout/Header';
import { Loader2 } from 'lucide-react';

export default function Home() {
  const { user } = useAuth();
  const location = useLocation();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [highlightedPostId, setHighlightedPostId] = useState<string | null>(null);
  const postRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  useEffect(() => {
    loadPosts();
    
    // Subscribe to realtime updates
    const channel = supabase
      .channel('posts-channel')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'posts',
        },
        () => {
          loadPosts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Scroll to post from notification
  useEffect(() => {
    const state = location.state as { scrollToPostId?: string } | null;
    if (state?.scrollToPostId && posts.length > 0) {
      const postId = state.scrollToPostId;
      const postElement = postRefs.current[postId];
      
      if (postElement) {
        setTimeout(() => {
          postElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          setHighlightedPostId(postId);
          
          // Remove highlight after 2 seconds
          setTimeout(() => {
            setHighlightedPostId(null);
          }, 2000);
        }, 100);
      }
      
      // Clear the state
      window.history.replaceState({}, document.title);
    }
  }, [location.state, posts]);

  const loadPosts = async () => {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('privacy', 'public')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setPosts((data || []) as Post[]);
    } catch (error) {
      console.error('Error loading posts:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <Header />
      
      <main className="container max-w-2xl mx-auto py-6 space-y-6">
        <CreatePost onPostCreated={loadPosts} />

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p>Nenhum post ainda. Seja o primeiro a postar!</p>
          </div>
        ) : (
          <div className="space-y-6">
            {posts.map((post) => (
              <div
                key={post.id}
                ref={(el) => (postRefs.current[post.id] = el)}
                className={`transition-all duration-500 ${
                  highlightedPostId === post.id ? 'ring-2 ring-primary rounded-lg' : ''
                }`}
              >
                <PostCard post={post} onDeleted={loadPosts} />
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
