import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase, type Profile as ProfileType, type Post } from '@/lib/supabase';
import Header from '@/components/Layout/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { Loader2, MapPin, Link as LinkIcon, Phone, Edit, MessageCircle, Ban, Camera, Bell, ChevronLeft, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import PostCard from '@/components/Post/PostCard';
import SubscribersList from '@/components/SubscribersList';

export default function Profile() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [profile, setProfile] = useState<ProfileType | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [currentPostIndex, setCurrentPostIndex] = useState(0);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [showSubscribers, setShowSubscribers] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    display_name: '',
    username: '',
    bio: '',
    location: '',
    website: '',
    phone: '',
    avatar_url: '',
  });

  const isOwnProfile = !userId || userId === user?.id;

  useEffect(() => {
    loadProfile();
    loadUserPosts();
    if (!isOwnProfile && userId) {
      checkIfBlocked(userId);
      checkIfFollowing(userId);
    }
  }, [user, userId]);

  const checkIfFollowing = async (followedId: string) => {
    if (!user) return;
    
    const { data } = await supabase
      .from('follows')
      .select('id')
      .eq('follower_id', user.id)
      .eq('followed_id', followedId)
      .maybeSingle();
    
    setIsFollowing(!!data);
  };

  const loadUserPosts = async () => {
    const profileId = userId || user?.id;
    if (!profileId) return;

    setLoadingPosts(true);
    try {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('author_id', profileId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUserPosts((data || []) as Post[]);
    } catch (error) {
      console.error('Error loading user posts:', error);
    } finally {
      setLoadingPosts(false);
    }
  };

  const checkIfBlocked = async (blockedId: string) => {
    if (!user) return;
    
    const { data } = await supabase
      .from('blocked_users')
      .select('id')
      .eq('blocker_id', user.id)
      .eq('blocked_id', blockedId)
      .maybeSingle();
    
    setIsBlocked(!!data);
  };

  const loadProfile = async () => {
    const profileId = userId || user?.id;
    if (!profileId) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', profileId)
        .single();

      if (error) throw error;

      if (data) {
        setProfile(data);
        setFollowersCount(data.followers_count || 0);
        if (isOwnProfile) {
          setFormData({
            display_name: data.display_name || '',
            username: data.username || '',
            bio: data.bio || '',
            location: data.location || '',
            website: data.website || '',
            phone: data.phone || '',
            avatar_url: data.avatar_url || '',
          });
        }
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Imagem muito grande. Máximo 5MB');
      return;
    }

    setUploadingAvatar(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/avatar.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('media')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('media')
        .getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      toast.success('Foto de perfil atualizada!');
      loadProfile();
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast.error('Erro ao carregar imagem');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update(formData)
        .eq('id', user!.id);

      if (error) throw error;

      toast.success('Perfil atualizado com sucesso!');
      setIsEditing(false);
      loadProfile();
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast.error('Erro ao atualizar perfil');
    } finally {
      setSaving(false);
    }
  };

  const handleBlockToggle = async () => {
    if (!userId || !user) return;

    try {
      if (isBlocked) {
        const { error } = await supabase
          .from('blocked_users')
          .delete()
          .eq('blocker_id', user.id)
          .eq('blocked_id', userId);

        if (error) throw error;
        toast.success('Usuário desbloqueado');
        setIsBlocked(false);
      } else {
        const { error } = await supabase
          .from('blocked_users')
          .insert({
            blocker_id: user.id,
            blocked_id: userId,
          });

        if (error) throw error;
        toast.success('Usuário bloqueado');
        setIsBlocked(true);
      }
    } catch (error) {
      console.error('Error toggling block:', error);
      toast.error('Erro ao bloquear/desbloquear usuário');
    }
  };

  const handleSendMessage = async () => {
    if (!userId || !user) return;

    try {
      // Check if user is blocked
      const { data: blockedCheck } = await supabase
        .from('blocked_users')
        .select('id')
        .or(`and(blocker_id.eq.${user.id},blocked_id.eq.${userId}),and(blocker_id.eq.${userId},blocked_id.eq.${user.id})`)
        .limit(1);

      if (blockedCheck && blockedCheck.length > 0) {
        toast.error('Não é possível enviar mensagem para este usuário');
        return;
      }

      // Get all chats where current user is a member
      const { data: myMemberships, error: memberError } = await supabase
        .from('chat_members')
        .select('chat_id')
        .eq('user_id', user.id);

      if (memberError) {
        console.error('Erro ao buscar memberships:', memberError);
        throw memberError;
      }

      // Check if chat already exists
      let existingChatId = null;
      
      if (myMemberships && myMemberships.length > 0) {
        const chatIds = myMemberships.map(m => m.chat_id);
        
        // For each chat, check if the other user is also a member
        for (const chatId of chatIds) {
          const { data: members, error: membersError } = await supabase
            .from('chat_members')
            .select('user_id')
            .eq('chat_id', chatId);

          if (membersError) continue;

          if (members && members.length === 2) {
            const memberIds = members.map(m => m.user_id);
            if (memberIds.includes(user.id) && memberIds.includes(userId)) {
              existingChatId = chatId;
              break;
            }
          }
        }
      }

      // If chat exists, navigate to it
      if (existingChatId) {
        navigate(`/chat/${existingChatId}`);
        return;
      }

      // Create new chat
      const { data: newChatData, error: insertError } = await supabase
        .from('chats')
        .insert([{ is_group: false }])
        .select('id')
        .single();

      if (insertError) {
        console.error('Erro ao criar chat:', insertError);
        throw insertError;
      }

      if (!newChatData || !newChatData.id) {
        throw new Error('Chat criado mas ID não retornado');
      }

      // Add both users as members
      const { error: addMembersError } = await supabase
        .from('chat_members')
        .insert([
          { chat_id: newChatData.id, user_id: user.id },
          { chat_id: newChatData.id, user_id: userId },
        ]);

      if (addMembersError) {
        console.error('Erro ao adicionar membros:', addMembersError);
        throw addMembersError;
      }

      // Navigate to the new chat
      navigate(`/chat/${newChatData.id}`);
    } catch (error: any) {
      console.error('Erro completo:', error);
      toast.error(`Erro ao iniciar conversa: ${error.message || 'Desconhecido'}`);
    }
  };

  const handleFollowToggle = async () => {
    if (!userId || !user) return;

    try {
      if (isFollowing) {
        const { error } = await supabase
          .from('follows')
          .delete()
          .eq('follower_id', user.id)
          .eq('followed_id', userId);

        if (error) throw error;
        toast.success('Assinatura cancelada');
        setIsFollowing(false);
        setFollowersCount(prev => Math.max(0, prev - 1));
      } else {
        const { error } = await supabase
          .from('follows')
          .insert({
            follower_id: user.id,
            followed_id: userId,
          });

        if (error) throw error;
        toast.success('Você é assinante e receberá notificações dos posts');
        setIsFollowing(true);
        setFollowersCount(prev => prev + 1);
      }
    } catch (error) {
      console.error('Error toggling follow:', error);
      toast.error('Erro ao seguir/deixar de seguir');
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <Header />
      
      <main className="container max-w-2xl mx-auto py-6">
        <Card className="shadow-lg">
          <CardHeader>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <Avatar className="h-20 w-20">
                      <AvatarImage src={profile?.avatar_url || ''} alt={profile?.display_name} />
                      <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground text-2xl">
                        {profile?.display_name?.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    {isOwnProfile && (
                      <>
                        <Button
                          size="icon"
                          variant="secondary"
                          className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={uploadingAvatar}
                        >
                          {uploadingAvatar ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Camera className="h-3 w-3" />
                          )}
                        </Button>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/jpeg,image/jpg,image/png,image/webp,image/gif,image/bmp,image/svg+xml"
                          onChange={handleAvatarUpload}
                          className="hidden"
                        />
                      </>
                    )}
                  </div>
                  <div>
                    <CardTitle className="text-2xl">{profile?.display_name}</CardTitle>
                    <div className="flex items-center gap-2">
                      <p className="text-muted-foreground">@{profile?.username}</p>
                      {isOwnProfile ? (
                        <Badge
                          variant="secondary"
                          className="text-xs cursor-pointer hover:bg-secondary/80 transition-colors"
                          onClick={() => setShowSubscribers(true)}
                        >
                          <Bell className="h-3 w-3 mr-1" />
                          {followersCount} {followersCount === 1 ? 'assinante' : 'assinantes'}
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">
                          {followersCount} {followersCount === 1 ? 'assinante' : 'assinantes'}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                {isOwnProfile && !isEditing && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditing(true)}
                    className="self-start"
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Editar
                  </Button>
                )}
              </div>
              {!isOwnProfile && (
                <div className="flex gap-2 flex-wrap">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleFollowToggle}
                    className="flex-1 min-w-[120px]"
                  >
                    {isFollowing ? (
                      <Bell className="h-4 w-4 mr-2 fill-current" />
                    ) : (
                      <Bell className="h-4 w-4 mr-2" />
                    )}
                    {isFollowing ? 'Assinado' : 'Assinar'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSendMessage}
                    className="flex-1 min-w-[120px]"
                  >
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Mensagem
                  </Button>
                  <Button
                    variant={isBlocked ? "secondary" : "destructive"}
                    size="sm"
                    onClick={handleBlockToggle}
                    className="flex-1 min-w-[120px]"
                  >
                    <Ban className="h-4 w-4 mr-2" />
                    {isBlocked ? 'Desbloquear' : 'Bloquear'}
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          
          <CardContent>
            {isOwnProfile && isEditing ? (
              <form onSubmit={handleSave} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="display_name">Nome de exibição</Label>
                  <Input
                    id="display_name"
                    value={formData.display_name}
                    onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="username">Nome de usuário</Label>
                  <Input
                    id="username"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bio">Biografia</Label>
                  <Textarea
                    id="bio"
                    value={formData.bio}
                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                    placeholder="Conte um pouco sobre você..."
                    className="min-h-[100px]"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location" className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Localização
                  </Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="São Paulo, Brasil"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="website" className="flex items-center gap-2">
                    <LinkIcon className="h-4 w-4" />
                    Website
                  </Label>
                  <Input
                    id="website"
                    type="url"
                    value={formData.website}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    placeholder="https://seusite.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone" className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    Telefone
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+55 (11) 99999-9999"
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    type="submit"
                    className="flex-1 bg-gradient-to-r from-primary to-accent hover:opacity-90"
                    disabled={saving}
                  >
                    {saving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      'Guardar alterações'
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsEditing(false)}
                  >
                    Cancelar
                  </Button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                {profile?.bio && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Biografia</p>
                    <p>{profile.bio}</p>
                  </div>
                )}
                {profile?.location && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>{profile.location}</span>
                  </div>
                )}
                {profile?.website && (
                  <div className="flex items-center gap-2">
                    <LinkIcon className="h-4 w-4 text-muted-foreground" />
                    <a href={profile.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                      {profile.website}
                    </a>
                  </div>
                )}
                {profile?.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{profile.phone}</span>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {userPosts.length > 0 && (
          <Card className="shadow-lg mt-6">
            <CardHeader>
              <CardTitle>Publicações</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingPosts ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                <>
                  <PostCard post={userPosts[currentPostIndex]} onDeleted={loadUserPosts} />
                  {userPosts.length > 1 && (
                    <div className="flex items-center justify-between mt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPostIndex(Math.max(0, currentPostIndex - 1))}
                        disabled={currentPostIndex === 0}
                      >
                        <ChevronLeft className="h-4 w-4 mr-2" />
                        Anterior
                      </Button>
                      <span className="text-sm text-muted-foreground">
                        {currentPostIndex + 1} de {userPosts.length}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPostIndex(Math.min(userPosts.length - 1, currentPostIndex + 1))}
                        disabled={currentPostIndex === userPosts.length - 1}
                      >
                        Próxima
                        <ChevronRight className="h-4 w-4 ml-2" />
                      </Button>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        )}
      </main>

      {isOwnProfile && user && (
        <SubscribersList
          userId={user.id}
          isOpen={showSubscribers}
          onClose={() => setShowSubscribers(false)}
        />
      )}
    </div>
  );
}
