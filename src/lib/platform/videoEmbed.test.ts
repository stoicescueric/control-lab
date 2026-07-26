import {describe, expect, it} from 'vitest';
import {toPrivacyEnhancedYoutubeUrl, toSafeExternalUrl} from './videoEmbed';

describe('toPrivacyEnhancedYoutubeUrl', () => {
  it('moves a YouTube embed to the privacy-enhanced host and preserves parameters', () => {
    expect(
      toPrivacyEnhancedYoutubeUrl('https://www.youtube.com/embed/example?start=12'),
    ).toBe('https://www.youtube-nocookie.com/embed/example?start=12');
  });

  it('accepts privacy-enhanced playlist embeds', () => {
    expect(
      toPrivacyEnhancedYoutubeUrl(
        'https://www.youtube-nocookie.com/embed/videoseries?list=example',
      ),
    ).toBe('https://www.youtube-nocookie.com/embed/videoseries?list=example');
  });

  it.each([
    'http://www.youtube.com/embed/example',
    'https://youtube.com.evil.example/embed/example',
    'https://www.youtube.com/watch?v=example',
    'javascript:alert(1)',
    'not a URL',
  ])('rejects unsafe or non-embed source %s', (source) => {
    expect(toPrivacyEnhancedYoutubeUrl(source)).toBeNull();
  });
});

describe('toSafeExternalUrl', () => {
  it('allows HTTPS links', () => {
    expect(toSafeExternalUrl('https://www.youtube.com/watch?v=example')).toBe(
      'https://www.youtube.com/watch?v=example',
    );
  });

  it.each(['http://example.com', 'javascript:alert(1)', undefined])(
    'rejects unsafe external link %s',
    (source) => {
      expect(toSafeExternalUrl(source)).toBeNull();
    },
  );
});
