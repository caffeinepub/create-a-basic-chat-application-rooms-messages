import type { UserProfile } from '../../backend';
import FlagBadge from './FlagBadge';

interface ProfileNameProps {
  profile: UserProfile;
  className?: string;
}

/**
 * Renders a user's display name with an optional flag badge inline.
 * Keeps layout inline to avoid breaking existing truncation/fallback behavior.
 */
export default function ProfileName({ profile, className = '' }: ProfileNameProps) {
  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <span>{profile.name}</span>
      <FlagBadge profileFlag={profile.profileFlag} />
    </span>
  );
}
