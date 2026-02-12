import type { UserProfile } from '../../backend';

interface UserAvatarProps {
  profile: UserProfile;
  size?: 'sm' | 'md' | 'lg';
}

export default function UserAvatar({ profile, size = 'md' }: UserAvatarProps) {
  const sizeClasses = {
    sm: 'h-8 w-8 text-sm',
    md: 'h-10 w-10 text-base',
    lg: 'h-20 w-20 text-2xl',
  };

  const initial = profile.textOverlays || profile.name.charAt(0).toUpperCase();

  // If profile picture exists, render it
  if (profile.profilePicture) {
    try {
      const imageUrl = profile.profilePicture.getDirectURL();
      return (
        <img
          src={imageUrl}
          alt={profile.name}
          className={`flex-shrink-0 rounded-full object-cover ${sizeClasses[size]}`}
          onError={(e) => {
            // Fallback to initials if image fails to load
            const target = e.target as HTMLImageElement;
            target.style.display = 'none';
            if (target.nextSibling) {
              (target.nextSibling as HTMLElement).style.display = 'flex';
            }
          }}
        />
      );
    } catch (error) {
      console.error('Failed to load profile picture:', error);
    }
  }

  // Fallback to color avatar with initials
  return (
    <div
      className={`flex-shrink-0 rounded-full flex items-center justify-center font-medium ${sizeClasses[size]}`}
      style={{
        backgroundColor: profile.backgroundColor,
        color: profile.color,
      }}
    >
      {initial}
    </div>
  );
}
