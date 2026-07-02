/* Wraps the doc content to show an estimated reading time above the title,
   computed client-side from the rendered text (so no per-page frontmatter is
   needed). Renders nothing during SSR; the chip appears after hydration. */

import {useEffect, useRef, useState} from 'react';
import Content from '@theme-original/DocItem/Content';
import type ContentType from '@theme/DocItem/Content';
import type {WrapperProps} from '@docusaurus/types';

type Props = WrapperProps<typeof ContentType>;

const WORDS_PER_MINUTE = 200;

export default function ContentWrapper(props: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [mins, setMins] = useState<number | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const words = (el.textContent ?? '').trim().split(/\s+/).filter(Boolean).length;
    setMins(Math.max(1, Math.round(words / WORDS_PER_MINUTE)));
  }, []);

  return (
    <div ref={ref}>
      {mins != null && (
        <p className="mb-3 flex items-center gap-1.5 font-mono text-[0.78rem] text-ink-faint">
          <svg viewBox="0 0 24 24" aria-hidden="true" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3 3" />
          </svg>
          ≈ {mins} min read
        </p>
      )}
      <Content {...props} />
    </div>
  );
}
