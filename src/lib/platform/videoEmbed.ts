const YOUTUBE_EMBED_HOSTS = new Set([
  'youtube.com',
  'www.youtube.com',
  'www.youtube-nocookie.com',
]);

export function toSafeExternalUrl(href: string | undefined): string | null {
  if (!href) return null;
  try {
    const url = new URL(href);
    return url.protocol === 'https:' ? url.toString() : null;
  } catch {
    return null;
  }
}

export function toPrivacyEnhancedYoutubeUrl(src: string): string | null {
  try {
    const url = new URL(src);
    if (
      url.protocol !== 'https:' ||
      !YOUTUBE_EMBED_HOSTS.has(url.hostname) ||
      !url.pathname.startsWith('/embed/')
    ) {
      return null;
    }
    url.hostname = 'www.youtube-nocookie.com';
    return url.toString();
  } catch {
    return null;
  }
}
