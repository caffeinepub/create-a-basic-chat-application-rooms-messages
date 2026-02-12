import { getFlagById } from '../../utils/flags';

interface FlagBadgeProps {
  profileFlag?: string;
  className?: string;
}

/**
 * Renders an image-based flag badge if the profileFlag is valid and allowed.
 * Returns null for unknown/disallowed flags.
 */
export default function FlagBadge({ profileFlag, className = '' }: FlagBadgeProps) {
  const flag = getFlagById(profileFlag);
  
  if (!flag) return null;

  return (
    <img
      src={flag.assetPath}
      alt={flag.label}
      title={flag.label}
      className={`inline-block h-4 w-auto object-contain ${className}`}
      style={{ maxWidth: '24px' }}
    />
  );
}
