import {describe, expect, it} from 'vitest';
import {parseConsentCookie} from './consent';

describe('parseConsentCookie', () => {
  it('reads an analytics grant among unrelated cookies', () => {
    expect(parseConsentCookie('theme=dark; control_lab_analytics_consent=granted; progress=4')).toBe(
      'granted',
    );
  });

  it('reads an analytics denial', () => {
    expect(parseConsentCookie('control_lab_analytics_consent=denied')).toBe('denied');
  });

  it('rejects unsupported values and similarly named cookies', () => {
    expect(parseConsentCookie('control_lab_analytics_consent=yes')).toBeNull();
    expect(parseConsentCookie('xcontrol_lab_analytics_consent=granted')).toBeNull();
  });

  it('handles an empty cookie header', () => {
    expect(parseConsentCookie('')).toBeNull();
  });
});
