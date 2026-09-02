import {useRef, useState} from 'react';
import {Demo, Buttons, Button, Readout, Legend} from '@site/src/components/kit/Demo';
import {evalSpline, moments} from '@site/src/lib/domain/naturalCubicSpline';

/* Natural cubic spline interpolation. Drag the waypoints; the demo parametrizes
   them by index t, solves the tridiagonal moment system for x(t) and y(t) (the
   Thomas algorithm), and draws the C2 curve through every point. The curvature
   comb shows curvature is continuous AND zero at the two ends (the "natural"
   boundary, M0 = Mn = 0). Pure React + SVG, SSR-safe. */

const W = 640;
const H = 360;
const KEY_STEP = 8; // px per arrow-key nudge, in SVG viewBox units
const SPATIAL_KEYS =
  'ArrowLeft ArrowRight ArrowUp ArrowDown Shift+ArrowLeft Shift+ArrowRight Shift+ArrowUp Shift+ArrowDown';

type Pt = {x: number; y: number};
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

const INIT: Pt[] = [
  {x: 70, y: 250},
  {x: 200, y: 110},
  {x: 330, y: 300},
  {x: 460, y: 120},
  {x: 580, y: 260},
];

export function NaturalCubicSpline() {
  const svgRef = useRef<SVGSVGElement>(null);
  const drag = useRef<number | null>(null);
  const [pts, setPts] = useState<Pt[]>(INIT);
  const [comb, setComb] = useState(true);

  const toSvg = (e: React.PointerEvent): Pt => {
    const r = svgRef.current!.getBoundingClientRect();
    return {x: ((e.clientX - r.left) * W) / r.width, y: ((e.clientY - r.top) * H) / r.height};
  };
  const onMove = (e: React.PointerEvent) => {
    if (drag.current == null) return;
    const p = toSvg(e);
    const i = drag.current;
    setPts((prev) =>
      prev.map((q, j) => (j === i ? {x: clamp(p.x, 14, W - 14), y: clamp(p.y, 14, H - 14)} : q)),
    );
  };
  const nudge = (i: number, dx: number, dy: number) => {
    setPts((prev) =>
      prev.map((q, j) =>
        j === i ? {x: clamp(q.x + dx, 14, W - 14), y: clamp(q.y + dy, 14, H - 14)} : q,
      ),
    );
  };
  const onKeyDown = (i: number) => (e: React.KeyboardEvent) => {
    const step = e.shiftKey ? KEY_STEP * 4 : KEY_STEP;
    switch (e.key) {
      case 'ArrowLeft':
        nudge(i, -step, 0);
        break;
      case 'ArrowRight':
        nudge(i, step, 0);
        break;
      case 'ArrowUp':
        nudge(i, 0, -step);
        break;
      case 'ArrowDown':
        nudge(i, 0, step);
        break;
      default:
        return;
    }
    e.preventDefault();
  };
  const endDrag = (e: React.PointerEvent<SVGSVGElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId))
      e.currentTarget.releasePointerCapture(e.pointerId);
    drag.current = null;
  };

  const n = pts.length;
  const X = pts.map((p) => p.x);
  const Y = pts.map((p) => p.y);
  const Mx = moments(X);
  const My = moments(Y);

  const SAMPLES = 200;
  const curve: Pt[] = [];
  const hairs: {x1: number; y1: number; x2: number; y2: number}[] = [];
  for (let k = 0; k <= SAMPLES; k++) {
    const t = (k / SAMPLES) * (n - 1);
    const sx = evalSpline(X, Mx, t);
    const sy = evalSpline(Y, My, t);
    curve.push({x: sx.v, y: sy.v});
    if (comb && k % 5 === 0) {
      const speed = Math.hypot(sx.d, sy.d) || 1;
      const kappa = (sx.d * sy.dd - sy.d * sx.dd) / Math.pow(sx.d * sx.d + sy.d * sy.d, 1.5);
      const nx = -sy.d / speed;
      const ny = sx.d / speed;
      const len = clamp((kappa || 0) * 9000, -64, 64);
      hairs.push({x1: sx.v, y1: sy.v, x2: sx.v + nx * len, y2: sy.v + ny * len});
    }
  }
  const d = `M ${curve.map((p) => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' L ')}`;

  return (
    <Demo title="Natural cubic spline: interpolates every point, with C² smoothness">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="block h-auto w-full touch-none rounded-xl bg-[#0b1120]"
        role="group"
        aria-label="Natural cubic spline through draggable waypoints with a curvature comb"
        onPointerMove={onMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}>
        {/* waypoint polyline */}
        <polyline
          points={pts.map((p) => `${p.x},${p.y}`).join(' ')}
          fill="none"
          stroke="#2a3656"
          strokeWidth="2"
          strokeDasharray="6 7"
          pointerEvents="none"
        />

        {/* curvature comb */}
        {hairs.map((h, i) => (
          <line
            key={i}
            x1={h.x1}
            y1={h.y1}
            x2={h.x2}
            y2={h.y2}
            stroke="#5ce08a"
            strokeWidth="1.5"
            opacity="0.5"
            pointerEvents="none"
          />
        ))}

        {/* the spline */}
        <path
          d={d}
          fill="none"
          stroke="#6f8bff"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
          pointerEvents="none"
        />

        {/* waypoints (all on the curve) */}
        {pts.map((p, i) => {
          const isEnd = i === 0 || i === n - 1;
          return (
            <g key={i}>
              <circle
                cx={p.x}
                cy={p.y}
                r="11"
                fill="#16203a"
                stroke={isEnd ? '#ffc24d' : '#9db0ff'}
                strokeWidth="3"
                style={{cursor: 'grab'}}
                className="focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-[#ffc24d]"
                tabIndex={0}
                role="application"
                aria-label={`Waypoint ${i + 1} of ${n} at x ${p.x.toFixed(0)}, y ${p.y.toFixed(0)}${isEnd ? '; curvature pinned to zero' : ''}. Use arrow keys to move; hold Shift to move faster.`}
                aria-keyshortcuts={SPATIAL_KEYS}
                onPointerDown={(e) => {
                  drag.current = i;
                  svgRef.current?.setPointerCapture(e.pointerId);
                  e.preventDefault();
                }}
                onKeyDown={onKeyDown(i)}
              />
              {isEnd && (
                <text
                  x={p.x}
                  y={p.y - 16}
                  textAnchor="middle"
                  fontFamily="JetBrains Mono, monospace"
                  fontSize="12"
                  fill="#ffd98a"
                  pointerEvents="none"
                  aria-hidden="true">
                  κ = 0
                </text>
              )}
            </g>
          );
        })}
      </svg>

      <p className="mt-2 px-1 text-[0.78rem] text-[#aab8d6]">
        Drag a waypoint, or focus it and use the arrow keys; hold Shift for a larger step.
      </p>

      <Buttons>
        <Button active={comb} onClick={() => setComb((v) => !v)}>
          Curvature comb
        </Button>
        <Button onClick={() => setPts(INIT)}>Reset</Button>
      </Buttons>
      <Readout
        items={[
          ['passes through', `all ${n} points`],
          ['continuity', 'C² (smooth curvature)'],
          ['end curvature', '0 (natural boundary)'],
        ]}
      />
      <Legend
        items={[
          {color: '#9db0ff', label: 'interior waypoints'},
          {color: '#ffc24d', label: 'ends — curvature pinned to 0'},
          {color: '#5ce08a', label: 'curvature comb'},
        ]}
      />
    </Demo>
  );
}

export default NaturalCubicSpline;
