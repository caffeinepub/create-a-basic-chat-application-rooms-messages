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

  const initial = profile.avatar.textOverlays || profile.name.charAt(0).toUpperCase();

  return (
    <div
      className={`flex-shrink-0 rounded-full flex items-center justify-center font-medium ${sizeClasses[size]}`}
      style={{
        backgroundColor: profile.avatar.backgroundColor,
        color: profile.avatar.color,
      }}
    >
      {initial}
    </div>
  );
}
