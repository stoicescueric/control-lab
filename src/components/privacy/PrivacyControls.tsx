import {useEffect, useState} from 'react';
import {
  CONSENT_CHANGED_EVENT,
  openConsentSettings,
  readConsent,
  type ConsentChoice,
} from '@site/src/lib/platform/consent';

export function PrivacyControls() {
  const [choice, setChoice] = useState<ConsentChoice | null>(null);

  useEffect(() => {
    setChoice(readConsent());
    const syncChoice = (event: Event) => {
      setChoice((event as CustomEvent<ConsentChoice>).detail);
    };
    window.addEventListener(CONSENT_CHANGED_EVENT, syncChoice);
    return () => window.removeEventListener(CONSENT_CHANGED_EVENT, syncChoice);
  }, []);

  const status =
    choice === 'granted' ? 'Analytics allowed' : choice === 'denied' ? 'Essential only' : 'Not selected';

  return (
    <div className="not-prose my-6 rounded-lg border border-line bg-surface p-5">
      <p className="mb-3 text-sm text-ink-soft">
        Current preference: <strong className="text-ink">{status}</strong>
      </p>
      <button className="button button--primary" type="button" onClick={openConsentSettings}>
        Change cookie settings
      </button>
    </div>
  );
}
