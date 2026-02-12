const SWITCH_INTENT_KEY = 'alt_account_switch_intent';

export function setSwitchIntent(targetPrincipal: string): void {
  sessionStorage.setItem(SWITCH_INTENT_KEY, targetPrincipal);
}

export function getSwitchIntent(): string | null {
  return sessionStorage.getItem(SWITCH_INTENT_KEY);
}

export function clearSwitchIntent(): void {
  sessionStorage.removeItem(SWITCH_INTENT_KEY);
}
