import {useEffect, useRef, useState} from 'react';
import Link from '@docusaurus/Link';
import {motion, useReducedMotion} from 'framer-motion';

/* Control Lab homepage hero. A grid of faint glyphs — NUMBERS and MATH SYMBOLS
   only — that brighten and lift toward the cursor in the brand blue, with a
   click-to-glitch flourish. Adapted from the "cyber matrix" pattern but retuned
   to the Control Lab palette (deep-navy band, brand-blue glow, no neon) so it
   reads as intentional rather than decorative.

   SSR-safe: the glyph grid is built in a client effect (Docusaurus renders this
   page on the server). The overlay copy renders normally for SEO and to avoid
   layout shift. Intensity is written straight to each tile's CSS variable in a
   throttled rAF loop — far cheaper than re-rendering hundreds of nodes. */

// Numbers and math symbols only — the alphabet of the curriculum.
const GLYPHS = [
  '0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
  '+', '−', '×', '÷', '=', '≠', '≈', '≤', '≥', '±',
  '∑', '∏', '∫', '∮', '∂', '∇', '√', '∞', '∝', '∈',
  'π', 'θ', 'ω', 'λ', 'μ', 'Δ', 'Σ', 'Φ', 'Ω', 'τ',
  '→', '·', '°', '²', '³', '½', '∀', '∃',
];
const pick = () => GLYPHS[Math.floor(Math.random() * GLYPHS.length)];

const EASE = [0.22, 1, 0.36, 1] as const;
const TILE = 58; // px target size; grid rounds to fit

export function MathMatrixHero() {
  const reduce = useReducedMotion();
  const rootRef = useRef<HTMLElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => setIsClient(true), []);

  useEffect(() => {
    const grid = gridRef.current;
    const root = rootRef.current;
    if (!isClient || !grid || !root) return;

    const buildGrid = () => {
      const w = root.clientWidth;
      const h = root.clientHeight;
      const columns = Math.max(1, Math.floor(w / TILE));
      const rows = Math.max(1, Math.floor(h / TILE));
      grid.style.setProperty('--columns', String(columns));
      grid.style.setProperty('--rows', String(rows));
      grid.innerHTML = '';
      for (let i = 0; i < columns * rows; i++) {
        const tile = document.createElement('div');
        tile.className = 'cl-tile';
        tile.textContent = pick();
        tile.onclick = (e) => {
          const t = e.currentTarget as HTMLElement;
          t.textContent = pick();
          t.classList.add('cl-glitch');
          window.setTimeout(() => t.classList.remove('cl-glitch'), 220);
        };
        grid.appendChild(tile);
      }
    };

    // Throttle pointer-driven intensity to one update per frame.
    let raf = 0;
    let mx = -1e4;
    let my = -1e4;
    const apply = () => {
      raf = 0;
      const radius = Math.max(220, root.clientWidth / 4);
      for (const tile of Array.from(grid.children) as HTMLElement[]) {
        const r = tile.getBoundingClientRect();
        const dx = mx - (r.left + r.width / 2);
        const dy = my - (r.top + r.height / 2);
        const d = Math.hypot(dx, dy);
        const intensity = Math.max(0, 1 - d / radius);
        tile.style.setProperty('--intensity', intensity.toFixed(3));
      }
    };
    const onMove = (e: PointerEvent) => {
      mx = e.clientX;
      my = e.clientY;
      if (!raf) raf = requestAnimationFrame(apply);
    };
    const onLeave = () => {
      mx = -1e4;
      my = -1e4;
      if (!raf) raf = requestAnimationFrame(apply);
    };

    buildGrid();
    window.addEventListener('resize', buildGrid);
    if (!reduce) {
      grid.addEventListener('pointermove', onMove);
      grid.addEventListener('pointerleave', onLeave);
    }
    return () => {
      window.removeEventListener('resize', buildGrid);
      grid.removeEventListener('pointermove', onMove);
      grid.removeEventListener('pointerleave', onLeave);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [isClient, reduce]);

  const rise = (delay: number) => ({
    initial: reduce ? false : {opacity: 0, y: 14},
    animate: {opacity: 1, y: 0},
    transition: {duration: 0.5, delay, ease: EASE},
  });

  return (
    <header
      ref={rootRef}
      className="relative flex min-h-[78vh] w-full items-center justify-center overflow-hidden border-b border-line bg-[#0a0f1e]">
      {/* glyph grid (built client-side) */}
      <div ref={gridRef} id="cl-tiles" aria-hidden="true" />

      {/* soft vignette so the centered copy keeps contrast over the grid */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{background: 'radial-gradient(ellipse 60% 70% at 50% 50%, rgba(10,15,30,0.78) 0%, rgba(10,15,30,0.35) 55%, transparent 100%)'}}
      />

      <style>{`
        #cl-tiles {
          position: absolute;
          inset: 0;
          display: grid;
          grid-template-columns: repeat(var(--columns, 12), 1fr);
          grid-template-rows: repeat(var(--rows, 8), 1fr);
          user-select: none;
        }
        #cl-tiles .cl-tile {
          --intensity: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: var(--font-mono);
          font-size: 1.06rem;
          cursor: pointer;
          color: hsl(224, 88%, calc(60% + var(--intensity) * 30%));
          opacity: calc(0.16 + var(--intensity) * 0.8);
          text-shadow: 0 0 calc(var(--intensity) * 14px) hsla(224, 95%, 66%, 0.9);
          transform: scale(calc(1 + var(--intensity) * 0.16));
          transition: color 0.2s ease, text-shadow 0.2s ease, transform 0.2s ease, opacity 0.2s ease;
        }
        #cl-tiles .cl-tile.cl-glitch {
          animation: cl-glitch-anim 0.22s ease;
        }
        @keyframes cl-glitch-anim {
          0%   { transform: scale(1);    color: #6f8bff; }
          50%  { transform: scale(1.22); color: #eaf0ff; text-shadow: 0 0 12px #93a7ff; }
          100% { transform: scale(1);    color: #6f8bff; }
        }
        @media (prefers-reduced-motion: reduce) {
          #cl-tiles .cl-tile { transition: none; }
        }
      `}</style>

      {/* overlay copy */}
      <div className="relative z-10 mx-auto max-w-3xl px-6 text-center">
        <motion.div
          {...rise(0)}
          className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.06] px-3.5 py-1.5 font-mono text-xs font-medium uppercase tracking-wide text-[#cfe0ff] backdrop-blur-sm">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-brand" />
          Interactive control-theory curriculum
        </motion.div>

        <motion.h1
          {...rise(0.06)}
          className="m-0 text-balance text-[2.4rem] font-extrabold leading-[1.06] tracking-tight text-white sm:text-[3.1rem]">
          Control theory you can see, derive, and deploy.
        </motion.h1>

        <motion.p
          {...rise(0.12)}
          className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-[#aab6d0]">
          A rigorous, interactive curriculum for competitive robotics programmers who want to
          understand the math and architecture beneath the libraries they use in competition.
        </motion.p>

        <motion.div {...rise(0.18)} className="mt-9 flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/docs/preface/why-math-matters"
            className="inline-flex items-center gap-2 rounded-[10px] bg-brand px-6 py-3 text-[0.95rem] font-semibold text-white no-underline shadow-[0_8px_24px_rgba(79,108,247,0.32)] transition-colors hover:bg-brand-dk">
            Start with the Preface
            <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </Link>
          <Link
            to="/docs/control-theory"
            className="inline-flex items-center rounded-[10px] border border-white/20 bg-white/[0.04] px-6 py-3 text-[0.95rem] font-semibold text-[#eaf0ff] no-underline transition-colors hover:bg-white/10">
            Jump to Control Theory
          </Link>
        </motion.div>

        <motion.p {...rise(0.24)} className="mt-7 font-mono text-xs text-[#7e8cac]">
          Open source / MIT licensed / Built for FTC and FRC programmers
        </motion.p>
      </div>
    </header>
  );
}

export default MathMatrixHero;
