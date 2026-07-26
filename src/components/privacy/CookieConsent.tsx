import {useEffect, useState, type ReactNode} from 'react';
import Link from '@docusaurus/Link';
import {useLocation} from '@docusaurus/router';
import {disableAnalytics, enableAnalytics, trackPageView} from '@site/src/lib/platform/analytics';
import {
  CONSENT_CHANGED_EVENT,
  OPEN_CONSENT_EVENT,
  readConsent,
  writeConsent,
  type ConsentChoice,
} from '@site/src/lib/platform/consent';
import styles from './CookieConsent.module.css';

interface CookieConsentProps {
  children?: ReactNode;
}

export function CookieConsent({children}: CookieConsentProps) {
  const location = useLocation();
  const [choice, setChoice] = useState<ConsentChoice | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    const storedChoice = readConsent();
    setChoice(storedChoice);
    setHydrated(true);
    if (storedChoice === 'granted') {
      enableAnalytics();
    }
  }, []);

  useEffect(() => {
    const openSettings = () => setSettingsOpen(true);
    const syncChoice = (event: Event) => {
      const nextChoice = (event as CustomEvent<ConsentChoice>).detail;
      setChoice(nextChoice);
    };

    window.addEventListener(OPEN_CONSENT_EVENT, openSettings);
    window.addEventListener(CONSENT_CHANGED_EVENT, syncChoice);
    return () => {
      window.removeEventListener(OPEN_CONSENT_EVENT, openSettings);
      window.removeEventListener(CONSENT_CHANGED_EVENT, syncChoice);
    };
  }, []);

  useEffect(() => {
    if (choice === 'granted') {
      trackPageView(`${location.pathname}${location.search}${location.hash}`);
    }
  }, [choice, location.hash, location.pathname, location.search]);

  const choose = (nextChoice: ConsentChoice) => {
    const previousChoice = choice;
    writeConsent(nextChoice);
    setChoice(nextChoice);
    setSettingsOpen(false);
    if (nextChoice === 'granted') {
      enableAnalytics();
    } else {
      disableAnalytics();
      if (previousChoice === 'granted') {
        window.location.reload();
      }
    }
  };

  const visible = hydrated && (choice === null || settingsOpen);

  return (
    <>
      {children}
      {visible ? (
        <aside className={styles.panel} role="dialog" aria-label="Analytics cookie settings">
          <div className={styles.header}>
            <div>
              <h2 className={styles.title}>Privacy choices</h2>
              <p className={styles.description}>
                Control Lab stores this choice. Optional Google Analytics helps identify useful
                lessons and stays off until you allow it.{' '}
                <Link to="/privacy">Privacy details</Link>
              </p>
            </div>
            {choice !== null ? (
              <button className={styles.close} type="button" onClick={() => setSettingsOpen(false)}>
                Close
              </button>
            ) : null}
          </div>
          <div className={styles.actions}>
            <button className="button button--secondary" type="button" onClick={() => choose('denied')}>
              Essential only
            </button>
            <button className="button button--primary" type="button" onClick={() => choose('granted')}>
              Allow analytics
            </button>
          </div>
        </aside>
      ) : null}
    </>
  );
}
