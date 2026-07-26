export type ConsentChoice = 'granted' | 'denied';

export const CONSENT_COOKIE = 'control_lab_analytics_consent';
export const CONSENT_CHANGED_EVENT = 'control-lab:consent-changed';
export const OPEN_CONSENT_EVENT = 'control-lab:open-consent-settings';

const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 180;

export function readConsent(): ConsentChoice | null {
  if (typeof document === 'undefined') return null;
  return parseConsentCookie(document.cookie);
}

export function parseConsentCookie(cookieHeader: string): ConsentChoice | null {
  const value = cookieHeader
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${CONSENT_COOKIE}=`))
    ?.slice(CONSENT_COOKIE.length + 1);

  return value === 'granted' || value === 'denied' ? value : null;
}

export function writeConsent(choice: ConsentChoice): void {
  const secure = location.protocol === 'https:' ? '; Secure' : '';
  document.cookie =
    `${CONSENT_COOKIE}=${choice}; Max-Age=${COOKIE_MAX_AGE_SECONDS}; ` +
    `Path=/; SameSite=Lax${secure}`;
  window.dispatchEvent(new CustomEvent<ConsentChoice>(CONSENT_CHANGED_EVENT, {detail: choice}));
}

export function openConsentSettings(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(OPEN_CONSENT_EVENT));
  }
}
