import { useState } from 'react';
import type { Server } from '../../backend';

interface ServerAvatarProps {
  server: Server;
  size?: 'sm' | 'md' | 'lg';
}

export default function ServerAvatar({ server, size = 'md' }: ServerAvatarProps) {
  const [imageError, setImageError] = useState(false);
  
  const sizeClasses = {
    sm: 'h-8 w-8 text-sm',
    md: 'h-10 w-10 text-base',
    lg: 'h-20 w-20 text-2xl',
  };

  // Generate initials from server name
  const getInitials = (name: string): string => {
    const words = name.trim().split(/\s+/);
    if (words.length === 1) {
      return words[0].substring(0, 2).toUpperCase();
    }
    return words.slice(0, 2).map(w => w.charAt(0).toUpperCase()).join('');
  };

  const initials = getInitials(server.name);

  // If server icon exists and hasn't errored, try to render it
  if (server.icon && !imageError) {
    try {
      const imageUrl = server.icon.getDirectURL();
      return (
        <img
          src={imageUrl}
          alt={server.name}
          className={`flex-shrink-0 rounded-lg object-cover ${sizeClasses[size]}`}
          onError={() => {
            console.warn('Failed to load server icon, falling back to initials');
            setImageError(true);
          }}
        />
      );
    } catch (error) {
      console.error('Failed to get server icon URL:', error);
      // Fall through to initials avatar
    }
  }

  // Fallback to color avatar with initials
  return (
    <div
      className={`flex-shrink-0 rounded-lg flex items-center justify-center font-semibold ${sizeClasses[size]} bg-primary/10 text-primary border border-primary/20`}
    >
      {initials}
    </div>
  );
}
