export type VideoType = 'youtube' | 'tiktok' | 'facebook' | 'drive' | 'mega' | 'streamable' | 'direct' | 'unknown';

export interface VideoInfo {
  type: VideoType;
  embedUrl: string | null;
  thumbnailUrl: string | null;
}

export function getVideoThumbnail(url: string): string | null {
  try {
    const cleanUrl = url.trim();
    
    // YouTube
    if (cleanUrl.includes('youtube.com') || cleanUrl.includes('youtu.be')) {
      let videoId: string | null = null;
      
      if (cleanUrl.includes('youtu.be/')) {
        videoId = cleanUrl.split('youtu.be/')[1]?.split('?')[0];
      } else if (cleanUrl.includes('youtube.com/watch')) {
        const urlParams = new URLSearchParams(cleanUrl.split('?')[1]);
        videoId = urlParams.get('v');
      } else if (cleanUrl.includes('youtube.com/embed/')) {
        videoId = cleanUrl.split('youtube.com/embed/')[1]?.split('?')[0];
      }
      
      if (videoId) {
        return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
      }
    }
    
    // TikTok - uses generic thumbnail
    if (cleanUrl.includes('tiktok.com')) {
      return 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=800&q=80';
    }
    
    // Facebook - uses generic thumbnail
    if (cleanUrl.includes('facebook.com')) {
      return 'https://images.unsplash.com/photo-1633675254053-d96c7668c3b8?w=800&q=80';
    }
    
    // For other platforms, return null
    return null;
  } catch (error) {
    return null;
  }
}

export function convertToEmbed(url: string): VideoInfo {
  try {
    const cleanUrl = url.trim();
    const thumbnailUrl = getVideoThumbnail(cleanUrl);
    
    // YouTube
    if (cleanUrl.includes('youtube.com') || cleanUrl.includes('youtu.be')) {
      let videoId: string | null = null;
      
      if (cleanUrl.includes('youtu.be/')) {
        videoId = cleanUrl.split('youtu.be/')[1]?.split('?')[0];
      } else if (cleanUrl.includes('youtube.com/watch')) {
        const urlParams = new URLSearchParams(cleanUrl.split('?')[1]);
        videoId = urlParams.get('v');
      } else if (cleanUrl.includes('youtube.com/embed/')) {
        videoId = cleanUrl.split('youtube.com/embed/')[1]?.split('?')[0];
      }
      
      if (videoId) {
        return {
          type: 'youtube',
          embedUrl: `https://www.youtube.com/embed/${videoId}`,
          thumbnailUrl,
        };
      }
    }
    
    // TikTok
    if (cleanUrl.includes('tiktok.com')) {
      const videoId = cleanUrl.match(/video\/(\d+)/)?.[1];
      if (videoId) {
        return {
          type: 'tiktok',
          embedUrl: `https://www.tiktok.com/embed/v2/${videoId}`,
          thumbnailUrl,
        };
      }
    }
    
    // Facebook
    if (cleanUrl.includes('facebook.com')) {
      const encodedUrl = encodeURIComponent(cleanUrl);
      return {
        type: 'facebook',
        embedUrl: `https://www.facebook.com/plugins/video.php?href=${encodedUrl}&show_text=false`,
        thumbnailUrl,
      };
    }
    
    // Google Drive
    if (cleanUrl.includes('drive.google.com')) {
      const fileId = cleanUrl.match(/[-\w]{25,}/)?.[0];
      if (fileId) {
        return {
          type: 'drive',
          embedUrl: `https://drive.google.com/file/d/${fileId}/preview`,
          thumbnailUrl,
        };
      }
    }
    
    // Mega
    if (cleanUrl.includes('mega.nz')) {
      return {
        type: 'mega',
        embedUrl: cleanUrl.replace('mega.nz', 'mega.nz/embed'),
        thumbnailUrl,
      };
    }
    
    // Streamable
    if (cleanUrl.includes('streamable.com')) {
      const videoId = cleanUrl.split('streamable.com/')[1];
      if (videoId) {
        return {
          type: 'streamable',
          embedUrl: `https://streamable.com/e/${videoId}`,
          thumbnailUrl,
        };
      }
    }
    
    // Direct video links
    if (cleanUrl.match(/\.(mp4|webm|ogg)$/i)) {
      return {
        type: 'direct',
        embedUrl: cleanUrl,
        thumbnailUrl,
      };
    }
    
    return {
      type: 'unknown',
      embedUrl: null,
      thumbnailUrl: null,
    };
  } catch (error) {
    console.error('Error parsing video URL:', error);
    return {
      type: 'unknown',
      embedUrl: null,
      thumbnailUrl: null,
    };
  }
}
