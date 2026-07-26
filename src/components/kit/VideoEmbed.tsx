import {useState, type ReactNode} from 'react';
import {toPrivacyEnhancedYoutubeUrl, toSafeExternalUrl} from '@site/src/lib/platform/videoEmbed';

interface VideoEmbedProps {
  title: string;
  src: string;
  href?: string;
  children?: ReactNode;
}

export function VideoEmbed({title, src, href, children}: VideoEmbedProps) {
  const [loaded, setLoaded] = useState(false);
  const privateEmbedUrl = toPrivacyEnhancedYoutubeUrl(src);
  const externalUrl = toSafeExternalUrl(href);

  return (
    <figure className="not-prose my-7 overflow-hidden rounded-[8px] border border-line bg-surface shadow-card">
      <div className="aspect-video w-full bg-panel">
        {loaded && privateEmbedUrl ? (
          <iframe
            className="h-full w-full"
            src={privateEmbedUrl}
            title={title}
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
            sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"
            allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        ) : (
          <button
            type="button"
            className="flex h-full w-full flex-col items-center justify-center gap-3 px-5 text-center text-panel-ink"
            onClick={() => setLoaded(true)}
            disabled={!privateEmbedUrl}
            aria-label={`Load video: ${title}`}>
            <span
              aria-hidden="true"
              className="grid h-14 w-14 place-items-center rounded-full bg-brand shadow-lg">
              <span className="ml-1 block h-0 w-0 border-y-[10px] border-y-transparent border-l-[16px] border-l-white" />
            </span>
            <span className="font-semibold">{privateEmbedUrl ? 'Load video' : 'Video unavailable'}</span>
            {privateEmbedUrl ? (
              <span className="max-w-xl text-sm text-panel-ink/70">
                YouTube loads only after you choose to play it.
              </span>
            ) : null}
          </button>
        )}
      </div>
      <figcaption className="cl-video-caption border-t border-line bg-surface-2 px-4 py-3 text-sm leading-relaxed text-ink-soft">
        <strong className="text-ink">{title}</strong>
        {children ? <> - {children}</> : null}
        {externalUrl ? (
          <>
            {' '}
            <a href={externalUrl} target="_blank" rel="noopener noreferrer">
              Open video
            </a>
          </>
        ) : null}
      </figcaption>
    </figure>
  );
}

export default VideoEmbed;
