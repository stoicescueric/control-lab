import type {ReactNode} from 'react';
import {CookieConsent} from '@site/src/components/privacy/CookieConsent';

interface RootProps {
  children: ReactNode;
}

export default function Root({children}: RootProps) {
  return <CookieConsent>{children}</CookieConsent>;
}
