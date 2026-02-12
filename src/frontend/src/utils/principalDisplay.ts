/**
 * Utility to derive a stable, truncated display string from a principal
 * for use as a fallback name when no user profile exists.
 */
export function getPrincipalDisplayName(principalString: string): string {
  if (!principalString) return 'Anonymous';
  
  // Take first 8 and last 4 characters with ellipsis
  if (principalString.length > 15) {
    return `${principalString.slice(0, 8)}...${principalString.slice(-4)}`;
  }
  
  return principalString;
}

/**
 * Get initials from a principal string for avatar fallback
 */
export function getPrincipalInitials(principalString: string): string {
  if (!principalString) return '?';
  
  // Use first two characters of the principal
  return principalString.slice(0, 2).toUpperCase();
}
