// Single source of truth for allowed flag badges
// Curated list of non-state flags, safe historical/defunct country flags, and union/international organization flags
// Explicitly excludes extremist/terrorist/hate symbols

export interface FlagOption {
  id: string;
  label: string;
  assetPath: string;
}

// Allowed flags list - only non-state, safe historical, and union flags
const ALLOWED_FLAGS: FlagOption[] = [
  // Non-state/identity flags
  { id: 'rainbow', label: 'Rainbow', assetPath: '/assets/generated/flag-rainbow.dim_96x64.png' },
  { id: 'transgender', label: 'Transgender', assetPath: '/assets/generated/flag-transgender.dim_96x64.png' },
  { id: 'non-binary', label: 'Non-Binary', assetPath: '/assets/generated/flag-non-binary.dim_96x64.png' },
  
  // Union/International organization flags
  { id: 'eu', label: 'European Union', assetPath: '/assets/generated/flag-eu.dim_96x64.png' },
  { id: 'african-union', label: 'African Union', assetPath: '/assets/generated/flag-african-union.dim_96x64.png' },
  { id: 'asean', label: 'ASEAN', assetPath: '/assets/generated/flag-asean.dim_96x64.png' },
  
  // Safe historical/defunct country flags (educational/historical context only)
  { id: 'ussr', label: 'USSR (Historical)', assetPath: '/assets/generated/flag-ussr.dim_96x64.png' },
  { id: 'rhodesia', label: 'Rhodesia (Historical)', assetPath: '/assets/generated/flag-rhodesia.dim_96x64.png' },
  { id: 'imperial-japan', label: 'Imperial Japan (Historical)', assetPath: '/assets/generated/flag-imperial-japan.dim_96x64.png' },
  { id: 'fascist-italy', label: 'Fascist Italy (Historical)', assetPath: '/assets/generated/flag-fascist-italy.dim_96x64.png' },
];

// Map for quick lookup
const FLAG_MAP = new Map<string, FlagOption>(
  ALLOWED_FLAGS.map(flag => [flag.id, flag])
);

/**
 * Get all allowed flag options for UI selection
 */
export function getAllowedFlags(): FlagOption[] {
  return ALLOWED_FLAGS;
}

/**
 * Validate and sanitize a flag ID
 * Returns the flag option if valid, null otherwise
 */
export function validateFlagId(flagId: string | undefined | null): FlagOption | null {
  if (!flagId) return null;
  return FLAG_MAP.get(flagId) || null;
}

/**
 * Get flag option by ID
 */
export function getFlagById(flagId: string | undefined | null): FlagOption | null {
  return validateFlagId(flagId);
}
