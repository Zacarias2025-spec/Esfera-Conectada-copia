import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import Header from '@/components/Layout/Header';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search as SearchIcon, Loader2 } from 'lucide-react';

export default function Search() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (searchQuery: string) => {
    setQuery(searchQuery);
    
    if (searchQuery.trim().length < 2) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .or(`display_name.ilike.%${searchQuery}%,username.ilike.%${searchQuery}%`)
        .limit(20);

      if (error) throw error;
      setResults(data || []);
    } catch (error) {
      console.error('Error searching users:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <Header />
      
      <main className="container max-w-2xl mx-auto py-6">
        <Card className="shadow-lg mb-6">
          <CardContent className="pt-6">
            <div className="relative">
              <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Buscar usuários..."
                value={query}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {loading && (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {!loading && results.length > 0 && (
          <div className="space-y-2">
            {results.map((profile) => (
              <Card
                key={profile.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => navigate(`/profile/${profile.id}`)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={profile.avatar_url} alt={profile.display_name} />
                      <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground">
                        {profile.display_name?.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-semibold">{profile.display_name}</p>
                      <p className="text-sm text-muted-foreground">@{profile.username}</p>
                      {profile.bio && (
                        <p className="text-sm text-muted-foreground line-clamp-1 mt-1">
                          {profile.bio}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {!loading && query.trim().length >= 2 && results.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <SearchIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Nenhum usuário encontrado</p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
