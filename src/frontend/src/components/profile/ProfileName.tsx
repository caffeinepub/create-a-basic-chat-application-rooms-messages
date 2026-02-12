import type { UserProfile } from '../../backend';

interface ProfileNameProps {
  profile: UserProfile;
  className?: string;
}

/**
 * Renders a user's display name.
 */
export default function ProfileName({ profile, className = '' }: ProfileNameProps) {
  return (
    <span className={className}>
      {profile.name}
    </span>
  );
}
