import {useRef, useState} from 'react';
import {Demo, Buttons, Button, Readout, Legend} from '@site/src/components/kit/Demo';

/* Interpolation vs. approximation, on the SAME four draggable points:
   - a cubic Bézier treats them as CONTROL points (approximates — only the ends
     lie on the curve),
   - a Catmull-Rom (cubic Hermite) treats them as WAYPOINTS (interpolates — the
     curve passes through all four).
   Quintic Hermite is the same interpolating idea with acceleration matched too,
   for C2 continuity. Pure React + SVG, SSR-safe. */

const W = 640;
const H = 360;

type Pt = {x: number; y: number};
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

function bez(p: Pt[], t: number): Pt {
  const u = 1 - t;
  return {
    x: u * u * u * p[0].x + 3 * u * u * t * p[1].x + 3 * u * t * t * p[2].x + t * t * t * p[3].x,
    y: u * u * u * p[0].y + 3 * u * u * t * p[1].y + 3 * u * t * t * p[2].y + t * t * t * p[3].y,
  };
}

// Catmull-Rom (cubic Hermite) through all four points, with one-sided end tangents.
function hermitePath(p: Pt[]): Pt[] {
  const m = [
    {x: p[1].x - p[0].x, y: p[1].y - p[0].y},
    {x: (p[2].x - p[0].x) / 2, y: (p[2].y - p[0].y) / 2},
    {x: (p[3].x - p[1].x) / 2, y: (p[3].y - p[1].y) / 2},
    {x: p[3].x - p[2].x, y: p[3].y - p[2].y},
  ];
  const out: Pt[] = [];
  for (let seg = 0; seg < 3; seg++) {
    const p0 = p[seg];
    const p1 = p[seg + 1];
    const m0 = m[seg];
    const m1 = m[seg + 1];
    const steps = 30;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const h00 = 2 * t ** 3 - 3 * t ** 2 + 1;
      const h10 = t ** 3 - 2 * t ** 2 + t;
      const h01 = -2 * t ** 3 + 3 * t ** 2;
      const h11 = t ** 3 - t ** 2;
      out.push({
        x: h00 * p0.x + h10 * m0.x + h01 * p1.x + h11 * m1.x,
        y: h00 * p0.y + h10 * m0.y + h01 * p1.y + h11 * m1.y,
      });
    }
  }
  return out;
}

const toPath = (pts: Pt[]) => `M ${pts.map((p) => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' L ')}`;

export function SplineCompare() {
  const svgRef = useRef<SVGSVGElement>(null);
  const drag = useRef<number | null>(null);
  const [pts, setPts] = useState<Pt[]>([
    {x: 80, y: 260},
    {x: 235, y: 110},
    {x: 410, y: 300},
    {x: 560, y: 120},
  ]);
  const [showBezier, setShowBezier] = useState(true);
  const [showHermite, setShowHermite] = useState(true);

  const toSvg = (e: React.PointerEvent): Pt => {
    const r = svgRef.current!.getBoundingClientRect();
    return {x: ((e.clientX - r.left) * W) / r.width, y: ((e.clientY - r.top) * H) / r.height};
  };
  const onMove = (e: React.PointerEvent) => {
    if (drag.current == null) return;
    const p = toSvg(e);
    const i = drag.current;
    setPts((prev) => prev.map((q, j) => (j === i ? {x: clamp(p.x, 14, W - 14), y: clamp(p.y, 14, H - 14)} : q)));
  };

  const bezierPts = Array.from({length: 90}, (_, i) => bez(pts, i / 89));

  return (
    <Demo title="Interpolation vs. approximation: same four points">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="block h-auto w-full touch-none rounded-xl bg-[#0b1120]"
        role="img"
        aria-label="Bézier approximation versus Hermite interpolation through the same points"
        onPointerMove={onMove}
        onPointerUp={() => (drag.current = null)}
        onPointerLeave={() => (drag.current = null)}>
        {/* polygon through the points */}
        <polyline points={pts.map((p) => `${p.x},${p.y}`).join(' ')} fill="none" stroke="#2a3656" strokeWidth="2" strokeDasharray="6 7" />

        {showBezier && <path d={toPath(bezierPts)} fill="none" stroke="#6f8bff" strokeWidth="4" strokeLinecap="round" />}
        {showHermite && <path d={toPath(hermitePath(pts))} fill="none" stroke="#5ce08a" strokeWidth="4" strokeLinecap="round" />}

        {pts.map((p, i) => {
          const onBezier = i === 0 || i === 3;
          return (
            <g key={i}>
              <circle
                cx={p.x}
                cy={p.y}
                r="11"
                fill="#16203a"
                stroke={onBezier ? '#9db0ff' : '#ffc24d'}
                strokeWidth="3"
                style={{cursor: 'grab'}}
                onPointerDown={(e) => {
                  drag.current = i;
                  (e.target as Element).setPointerCapture(e.pointerId);
                }}
              />
              <text x={p.x} y={p.y - 16} textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="13" fill="#8294b8">
                {i === 0 || i === 3 ? `end` : `mid`}
              </text>
            </g>
          );
        })}
      </svg>

      <Buttons>
        <Button active={showBezier} onClick={() => setShowBezier((v) => !v)}>
          Bézier (control points)
        </Button>
        <Button active={showHermite} onClick={() => setShowHermite((v) => !v)}>
          Hermite (waypoints)
        </Button>
        <Button
          onClick={() =>
            setPts([
              {x: 80, y: 260},
              {x: 235, y: 110},
              {x: 410, y: 300},
              {x: 560, y: 120},
            ])
          }>
          Reset
        </Button>
      </Buttons>
      <Readout
        items={[
          ['Bézier passes through', '2 of 4 (ends only)'],
          ['Hermite passes through', '4 of 4 (all)'],
        ]}
      />
      <Legend
        items={[
          {color: '#6f8bff', label: 'Bézier — approximates'},
          {color: '#5ce08a', label: 'Hermite — interpolates'},
        ]}
      />
    </Demo>
  );
}

export default SplineCompare;
