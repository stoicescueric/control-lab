import type {ReactNode} from 'react';

interface VideoEmbedProps {
  title: string;
  src: string;
  href?: string;
  children?: ReactNode;
}

export function VideoEmbed({title, src, href, children}: VideoEmbedProps) {
  return (
    <figure className="not-prose my-7 overflow-hidden rounded-xl border border-line bg-surface shadow-card">
      <div className="aspect-video w-full bg-panel">
        <iframe
          className="h-full w-full"
          src={src}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      </div>
      <figcaption className="cl-video-caption border-t border-line bg-surface-2 px-4 py-3 text-sm leading-relaxed text-ink-soft">
        <strong className="text-ink">{title}</strong>
        {children ? <> - {children}</> : null}
        {href ? (
          <>
            {' '}
            <a href={href} target="_blank" rel="noreferrer">
              Open video
            </a>
          </>
        ) : null}
      </figcaption>
    </figure>
  );
}

export default VideoEmbed;
