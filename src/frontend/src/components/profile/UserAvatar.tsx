import { useState } from 'react';
import type { UserProfile } from '../../backend';

interface UserAvatarProps {
  profile: UserProfile;
  size?: 'sm' | 'md' | 'lg';
  fallbackInitials?: string;
  fallbackColor?: string;
  fallbackBgColor?: string;
}

export default function UserAvatar({ 
  profile, 
  size = 'md',
  fallbackInitials,
  fallbackColor,
  fallbackBgColor
}: UserAvatarProps) {
  const [imageError, setImageError] = useState(false);
  
  const sizeClasses = {
    sm: 'h-8 w-8 text-sm',
    md: 'h-10 w-10 text-base',
    lg: 'h-20 w-20 text-2xl',
  };

  const initial = fallbackInitials || profile.textOverlays || profile.name.charAt(0).toUpperCase();
  const color = fallbackColor || profile.color;
  const backgroundColor = fallbackBgColor || profile.backgroundColor;

  // If profile picture exists and hasn't errored, try to render it
  if (profile.profilePicture && !imageError) {
    try {
      const imageUrl = profile.profilePicture.getDirectURL();
      return (
        <img
          src={imageUrl}
          alt={profile.name}
          className={`flex-shrink-0 rounded-full object-cover ${sizeClasses[size]}`}
          onError={() => {
            console.warn('Failed to load profile picture, falling back to initials');
            setImageError(true);
          }}
        />
      );
    } catch (error) {
      console.error('Failed to get profile picture URL:', error);
      // Fall through to initials avatar
    }
  }

  // Fallback to color avatar with initials
  return (
    <div
      className={`flex-shrink-0 rounded-full flex items-center justify-center font-medium ${sizeClasses[size]}`}
      style={{
        backgroundColor,
        color,
      }}
    >
      {initial}
    </div>
  );
}
