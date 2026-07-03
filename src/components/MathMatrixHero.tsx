import {useEffect, useRef} from 'react';
import Link from '@docusaurus/Link';
import {useDprCanvas, useRaf} from '@site/src/lib/canvas';

/* Control Lab homepage hero. A grid of faint glyphs — NUMBERS and MATH SYMBOLS
   only — that brighten and lift toward the cursor, plus a live PID strip under
   the CTAs: a real PD controller chasing its setpoint, click/tap to move it.

   Theme-aware: light theme gets a pale band with ink glyphs, dark theme the
   deep-navy band; both are pure CSS ([data-theme] overrides), so there is no
   hydration flash. The PID strip stays a dark panel in both themes, matching
   every demo panel on the site.

   Performance notes:
   - The overlay copy animates with CSS keyframes (not JS), so the headline
     paints with the first frame of HTML — no hydration-blocked LCP.
   - Tile centers are cached at build/resize; the pointer loop does ONE
     getBoundingClientRect per frame instead of one per tile.
   - SSR-safe: the glyph grid and canvas draw only in client effects. */

// Numbers and math symbols only — the alphabet of the curriculum.
const GLYPHS = [
  '0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
  '+', '−', '×', '÷', '=', '≠', '≈', '≤', '≥', '±',
  '∑', '∏', '∫', '∮', '∂', '∇', '√', '∞', '∝', '∈',
  'π', 'θ', 'ω', 'λ', 'μ', 'Δ', 'Σ', 'Φ', 'Ω', 'τ',
  '→', '·', '°', '²', '³', '½', '∀', '∃',
];
const pick = () => GLYPHS[Math.floor(Math.random() * GLYPHS.length)];

const TILE = 58; // px target size; grid rounds to fit

/* --------------------------------------------------------------------------
   The live PID strip: a PD controller tracking a setpoint that moves — on its
   own every few seconds, or wherever the visitor clicks. The trace is the
   system output; the dashed amber line is the setpoint.
   -------------------------------------------------------------------------- */
const PID_WINDOW = 9; // seconds of history on screen
const KP = 26;
const KD = 4.2; // underdamped enough to show a visible, settling overshoot

function HeroPidStrip() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const size = useDprCanvas(canvasRef, 128);

  const st = useRef({
    t: 0,
    y: 0.3,
    v: 0,
    sp: 0.7,
    nextJump: 3.6,
    samples: [] as {t: number; y: number; s: number}[],
  });

  function step(dt: number) {
    const s = st.current;
    s.t += dt;
    if (s.t >= s.nextJump) {
      // pick a setpoint far enough from here that the step reads clearly
      let next = s.sp;
      while (Math.abs(next - s.sp) < 0.25) next = 0.2 + Math.random() * 0.6;
      s.sp = next;
      s.nextJump = s.t + 4.2;
    }
    const a = KP * (s.sp - s.y) - KD * s.v;
    s.v += a * dt;
    s.y += s.v * dt;
    s.samples.push({t: s.t, y: s.y, s: s.sp});
    while (s.samples.length && s.samples[0].t < s.t - PID_WINDOW - 0.5) s.samples.shift();
  }

  function draw() {
    const c = canvasRef.current;
    const cx = c?.getContext('2d');
    if (!c || !cx) return;
    const {w, h} = size.current;
    const s = st.current;

    cx.fillStyle = '#0b1120';
    cx.fillRect(0, 0, w, h);

    cx.strokeStyle = 'rgba(255,255,255,0.05)';
    cx.lineWidth = 1;
    for (const g of [0.25, 0.5, 0.75]) {
      cx.beginPath();
      cx.moveTo(0, g * h);
      cx.lineTo(w, g * h);
      cx.stroke();
    }

    const t1 = Math.max(s.t, PID_WINDOW);
    const px = (t: number) => ((t - (t1 - PID_WINDOW)) / PID_WINDOW) * w;
    const py = (v: number) => 12 + (1 - Math.min(Math.max(v, 0), 1)) * (h - 24);

    // setpoint: stepped, dashed amber
    cx.strokeStyle = '#ffc24d';
    cx.lineWidth = 1.6;
    cx.setLineDash([6, 6]);
    cx.beginPath();
    let started = false;
    for (let i = 0; i < s.samples.length; i++) {
      const p = s.samples[i];
      if (!started) {
        cx.moveTo(px(p.t), py(p.s));
        started = true;
      } else {
        const prev = s.samples[i - 1];
        if (prev.s !== p.s) cx.lineTo(px(p.t), py(prev.s)); // vertical edge of the step
        cx.lineTo(px(p.t), py(p.s));
      }
    }
    cx.stroke();
    cx.setLineDash([]);

    // system output: teal trace
    cx.strokeStyle = '#5fd3c4';
    cx.lineWidth = 2.4;
    cx.lineJoin = 'round';
    cx.beginPath();
    s.samples.forEach((p, i) => (i === 0 ? cx.moveTo(px(p.t), py(p.y)) : cx.lineTo(px(p.t), py(p.y))));
    cx.stroke();

    // head dot
    if (s.samples.length) {
      const head = s.samples[s.samples.length - 1];
      cx.beginPath();
      cx.arc(px(head.t), py(head.y), 3.2, 0, 7);
      cx.fillStyle = '#eaf0ff';
      cx.fill();
    }

    const err = Math.abs(s.sp - s.y);
    cx.font = '11px ui-monospace,monospace';
    cx.textAlign = 'right';
    cx.fillStyle = err < 0.02 ? '#5ce08a' : '#8294b8';
    cx.fillText(`error ${err.toFixed(3)}`, w - 10, 18);
    cx.textAlign = 'left';
  }

  useRaf((frameDt: number) => {
    const dt = Math.min(frameDt, 0.05);
    const sub = 4; // small substeps keep the spring stable
    for (let i = 0; i < sub; i++) step(dt / sub);
    draw();
  }, canvasRef);

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const frac = 1 - (e.clientY - rect.top) / rect.height;
    st.current.sp = Math.min(0.92, Math.max(0.08, frac));
    st.current.nextJump = st.current.t + 4.2;
  };

  return (
    <div className="cl-rise mx-auto mt-12 w-full max-w-2xl" style={{animationDelay: '0.3s'}}>
      <div className="rounded-2xl border border-ink/10 bg-[#0b1120] p-2 shadow-pop dark:border-white/10">
        <div className="flex items-baseline justify-between px-2 pb-1.5 pt-1 font-mono text-[0.66rem] uppercase tracking-wider">
          <span className="font-bold text-[#5fd3c4]">Live · PID reaching its setpoint</span>
          <span className="hidden text-[#8294b8] normal-case tracking-normal sm:inline">click to move the setpoint</span>
        </div>
        <canvas
          ref={canvasRef}
          onPointerDown={onPointerDown}
          role="img"
          aria-label="Live strip chart of a PID controller: a teal output trace chasing a dashed setpoint line. Click anywhere to move the setpoint."
          className="block w-full cursor-crosshair rounded-xl bg-[#0b1120] touch-none"
        />
      </div>
    </div>
  );
}

export function MathMatrixHero() {
  const rootRef = useRef<HTMLElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const grid = gridRef.current;
    const root = rootRef.current;
    if (!grid || !root) return;

    // Tile centers relative to the grid, cached at build time so the pointer
    // loop never queries per-tile layout.
    let centers: {el: HTMLElement; x: number; y: number}[] = [];

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
      centers = (Array.from(grid.children) as HTMLElement[]).map((el) => ({
        el,
        x: el.offsetLeft + el.offsetWidth / 2,
        y: el.offsetTop + el.offsetHeight / 2,
      }));
    };

    // Throttle pointer-driven intensity to one update per frame; one rect
    // query per frame, arithmetic for the rest.
    let raf = 0;
    let mx = -1e4;
    let my = -1e4;
    const apply = () => {
      raf = 0;
      const gr = grid.getBoundingClientRect();
      const relX = mx - gr.left;
      const relY = my - gr.top;
      const radius = Math.max(220, root.clientWidth / 4);
      for (const {el, x, y} of centers) {
        const d = Math.hypot(relX - x, relY - y);
        const intensity = Math.max(0, 1 - d / radius);
        el.style.setProperty('--intensity', intensity.toFixed(3));
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
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
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
  }, []);

  return (
    <header
      ref={rootRef}
      className="relative flex min-h-[86vh] w-full items-center justify-center overflow-hidden border-b border-line bg-bg">
      {/* glyph grid (built client-side) */}
      <div ref={gridRef} id="cl-tiles" aria-hidden="true" />

      {/* soft vignette so the centered copy keeps contrast over the grid */}
      <div aria-hidden="true" id="cl-hero-vignette" className="pointer-events-none absolute inset-0" />

      <style>{`
        @keyframes cl-rise-anim {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: none; }
        }
        .cl-rise {
          animation: cl-rise-anim 0.55s cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        #cl-hero-vignette {
          background: radial-gradient(ellipse 60% 70% at 50% 50%, rgba(243,246,252,0.82) 0%, rgba(243,246,252,0.4) 55%, transparent 100%);
        }
        [data-theme='dark'] #cl-hero-vignette {
          background: radial-gradient(ellipse 60% 70% at 50% 50%, rgba(10,15,30,0.78) 0%, rgba(10,15,30,0.35) 55%, transparent 100%);
        }
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
          color: hsl(226, 55%, calc(74% - var(--intensity) * 28%));
          opacity: calc(0.5 + var(--intensity) * 0.5);
          text-shadow: 0 0 calc(var(--intensity) * 12px) hsla(226, 90%, 60%, 0.45);
          transform: scale(calc(1 + var(--intensity) * 0.16));
          transition: color 0.2s ease, text-shadow 0.2s ease, transform 0.2s ease, opacity 0.2s ease;
        }
        [data-theme='dark'] #cl-tiles .cl-tile {
          color: hsl(224, 88%, calc(60% + var(--intensity) * 30%));
          opacity: calc(0.16 + var(--intensity) * 0.8);
          text-shadow: 0 0 calc(var(--intensity) * 14px) hsla(224, 95%, 66%, 0.9);
        }
        #cl-tiles .cl-tile.cl-glitch {
          animation: cl-glitch-anim 0.22s ease;
        }
        @keyframes cl-glitch-anim {
          0%   { transform: scale(1);    color: #6f8bff; }
          50%  { transform: scale(1.22); color: #eaf0ff; text-shadow: 0 0 12px #93a7ff; }
          100% { transform: scale(1);    color: #6f8bff; }
        }
        [data-theme='light'] #cl-tiles .cl-tile.cl-glitch,
        html:not([data-theme='dark']) #cl-tiles .cl-tile.cl-glitch {
          animation: cl-glitch-anim-light 0.22s ease;
        }
        @keyframes cl-glitch-anim-light {
          0%   { transform: scale(1);    color: #4f6cf7; }
          50%  { transform: scale(1.22); color: #1c2333; text-shadow: 0 0 12px #93a7ff; }
          100% { transform: scale(1);    color: #4f6cf7; }
        }
        @media (prefers-reduced-motion: reduce) {
          #cl-tiles .cl-tile { transition: none; }
        }
      `}</style>

      {/* overlay copy — CSS-animated so it paints before hydration */}
      <div className="relative z-10 mx-auto max-w-4xl px-6 py-16 text-center">
        <div
          className="cl-rise mb-8 inline-flex items-center gap-2 rounded-full border border-ink/10 bg-white/70 px-4 py-1.5 text-[0.78rem] font-medium tracking-wide text-ink-soft backdrop-blur-md dark:border-white/10 dark:bg-white/[0.06] dark:text-[#cfe0ff]">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-brand" />
          Interactive control-theory curriculum
        </div>

        <h1
          className="cl-rise m-0 text-balance text-[2.7rem] font-semibold leading-[1.04] tracking-[-0.025em] text-ink sm:text-[3.9rem] lg:text-[4.5rem] dark:text-white"
          style={{animationDelay: '0.06s'}}>
          Control theory you can{' '}
          <span className="bg-gradient-to-r from-[#4f6cf7] via-[#3a52d6] to-[#0f9d8f] bg-clip-text text-transparent dark:from-[#93a7ff] dark:via-[#6f8bff] dark:to-[#5fd3c4]">
            see, derive, and deploy.
          </span>
        </h1>

        <p
          className="cl-rise mx-auto mt-7 max-w-2xl text-balance text-lg leading-relaxed text-ink-soft sm:text-xl"
          style={{animationDelay: '0.12s'}}>
          A rigorous, interactive curriculum for competitive robotics programmers — the math and
          architecture beneath the libraries you compete with.
        </p>

        <div className="cl-rise mt-10 flex flex-wrap items-center justify-center gap-3.5" style={{animationDelay: '0.18s'}}>
          <Link
            to="/docs/preface/why-math-matters"
            className="inline-flex items-center gap-2 rounded-full bg-brand px-7 py-3.5 text-[0.98rem] font-semibold text-white no-underline shadow-[0_10px_32px_rgba(79,108,247,0.38)] transition-all hover:bg-brand-dk hover:shadow-[0_12px_40px_rgba(79,108,247,0.5)]">
            Start learning
            <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </Link>
          <Link
            to="/docs/control-theory"
            className="inline-flex items-center rounded-full border border-ink/15 bg-white/60 px-7 py-3.5 text-[0.98rem] font-semibold text-ink no-underline backdrop-blur-md transition-colors hover:bg-white dark:border-white/15 dark:bg-white/[0.06] dark:text-[#eaf0ff] dark:hover:bg-white/[0.12]">
            Explore the curriculum
          </Link>
        </div>

        <HeroPidStrip />

        <p className="cl-rise mt-9 text-[0.78rem] font-medium tracking-wide text-ink-faint" style={{animationDelay: '0.36s'}}>
          Open source · MIT licensed · Built for FTC and FRC programmers
        </p>
      </div>
    </header>
  );
}

export default MathMatrixHero;
