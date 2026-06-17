/* Thin wrapper over the GA4 gtag that the Docusaurus `gtag` preset option
   injects (window.gtag). Safe to call anywhere: it's a no-op during SSR, in
   `npm start` dev (no gtag), and when analytics is blocked. Use it to record
   which interactive demos people actually engage with.

     import {track} from '@site/src/lib/analytics';
     track('pid_preset', {preset: 'tuned'}); */

type GtagFn = (command: 'event', action: string, params?: Record<string, unknown>) => void;

export function track(action: string, params: Record<string, unknown> = {}): void {
  if (typeof window === 'undefined') return;
  const gtag = (window as unknown as {gtag?: GtagFn}).gtag;
  if (typeof gtag === 'function') {
    gtag('event', action, {event_category: 'demo', ...params});
  }
}
