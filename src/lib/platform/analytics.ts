/* Consent-gated GA4 loader and event wrapper. The Google script is never
   requested until the visitor explicitly grants analytics consent.

     import {track} from '@site/src/lib/platform/analytics';
     track('pid_preset', {preset: 'tuned'}); */

export const ANALYTICS_ID = 'G-DP9QJ8EJWH';

const SCRIPT_ID = 'control-lab-google-analytics';
let analyticsEnabled = false;

type GtagFn = (...args: unknown[]) => void;

interface AnalyticsWindow extends Window {
  dataLayer?: unknown[][];
  gtag?: GtagFn;
}

function analyticsWindow(): AnalyticsWindow {
  return window as AnalyticsWindow;
}

function getOrCreateGtag(): GtagFn {
  const target = analyticsWindow();
  target.dataLayer ??= [];
  target.gtag ??= (...args: unknown[]) => {
    target.dataLayer?.push(args);
  };
  return target.gtag;
}

function removeAnalyticsCookies(): void {
  const cookieNames = document.cookie
    .split(';')
    .map((cookie) => cookie.trim().split('=')[0])
    .filter((name) => name === '_ga' || name.startsWith('_ga_'));

  for (const name of cookieNames) {
    for (const path of ['/', '/control-lab/']) {
      document.cookie = `${name}=; Max-Age=0; Path=${path}; SameSite=Lax`;
      document.cookie = `${name}=; Max-Age=0; Path=${path}; Domain=${location.hostname}; SameSite=Lax`;
    }
  }
}

export function enableAnalytics(): void {
  if (typeof window === 'undefined') return;
  if (analyticsEnabled) return;

  const gtag = getOrCreateGtag();
  gtag('consent', 'default', {
    analytics_storage: 'denied',
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
  });
  gtag('consent', 'update', {
    analytics_storage: 'granted',
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
  });
  gtag('js', new Date());
  gtag('config', ANALYTICS_ID, {
    anonymize_ip: true,
    allow_ad_personalization_signals: false,
    allow_google_signals: false,
    send_page_view: false,
  });

  analyticsEnabled = true;
  if (!document.getElementById(SCRIPT_ID)) {
    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(ANALYTICS_ID)}`;
    script.referrerPolicy = 'strict-origin-when-cross-origin';
    document.head.appendChild(script);
  }
}

export function disableAnalytics(): void {
  if (typeof window === 'undefined') return;

  const target = analyticsWindow();
  target.gtag?.('consent', 'update', {
    analytics_storage: 'denied',
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
  });

  analyticsEnabled = false;
  document.getElementById(SCRIPT_ID)?.remove();
  removeAnalyticsCookies();
  target.gtag = undefined;
  target.dataLayer = [];
}

export function trackPageView(path: string): void {
  if (!analyticsEnabled || typeof window === 'undefined') return;
  analyticsWindow().gtag?.('event', 'page_view', {
    page_location: window.location.href,
    page_path: path,
    page_title: document.title,
  });
}

export function track(action: string, params: Record<string, unknown> = {}): void {
  if (!analyticsEnabled || typeof window === 'undefined') return;
  analyticsWindow().gtag?.('event', action, {event_category: 'demo', ...params});
}
