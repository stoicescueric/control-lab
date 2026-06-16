import {useRef, useState} from 'react';
import {Demo, Buttons, Button, Readout, Legend} from '@site/src/components/kit/Demo';

/* Curvature = 1/R of the circle through three points (Menger curvature).
   Drag P, Q, R; the circumscribed circle, its radius, and the curvature update
   live. Collinear points -> infinite radius -> zero curvature (a straight line).
   Pure React + SVG, SSR-safe (pointer geometry only read in handlers). */

const W = 640;
const H = 360;
const FIELD = 144; // treat the canvas width as a 12 ft (144 in) field
const SCALE = FIELD / W; // inches per pixel

type Pt = {x: number; y: number};
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y);

function circumcircle(P: Pt, Q: Pt, R: Pt): {center: Pt; r: number} | null {
  const d = 2 * (P.x * (Q.y - R.y) + Q.x * (R.y - P.y) + R.x * (P.y - Q.y));
  if (Math.abs(d) < 1e-6) return null; // collinear
  const p2 = P.x * P.x + P.y * P.y;
  const q2 = Q.x * Q.x + Q.y * Q.y;
  const r2 = R.x * R.x + R.y * R.y;
  const ux = (p2 * (Q.y - R.y) + q2 * (R.y - P.y) + r2 * (P.y - Q.y)) / d;
  const uy = (p2 * (R.x - Q.x) + q2 * (P.x - R.x) + r2 * (Q.x - P.x)) / d;
  const center = {x: ux, y: uy};
  return {center, r: dist(center, P)};
}

const LABELS = ['P', 'Q', 'R'];

export function CurvatureCircle() {
  const svgRef = useRef<SVGSVGElement>(null);
  const drag = useRef<number | null>(null);
  const [pts, setPts] = useState<Pt[]>([
    {x: 150, y: 250},
    {x: 320, y: 110},
    {x: 490, y: 250},
  ]);

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

  const cc = circumcircle(pts[0], pts[1], pts[2]);
  const straight = !cc || cc.r > 6000;
  const rInches = cc ? cc.r * SCALE : Infinity;
  const kappa = straight ? 0 : 1 / rInches;

  return (
    <Demo title="Curvature is 1 / radius of the circle through three points">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="block h-auto w-full touch-none rounded-xl bg-[#0b1120]"
        role="img"
        aria-label="Three draggable points and the circle through them, showing curvature equals one over radius"
        onPointerMove={onMove}
        onPointerUp={() => (drag.current = null)}
        onPointerLeave={() => (drag.current = null)}>
        {/* the circle (or, when collinear, the line through the points) */}
        {!straight && cc && (
          <>
            <circle cx={cc.center.x} cy={cc.center.y} r={cc.r} fill="none" stroke="#6f8bff" strokeWidth="2.5" opacity="0.85" />
            <circle cx={cc.center.x} cy={cc.center.y} r="4" fill="#6f8bff" />
            {/* radius to Q */}
            <line x1={cc.center.x} y1={cc.center.y} x2={pts[1].x} y2={pts[1].y} stroke="#ffc24d" strokeWidth="2.5" strokeDasharray="6 5" />
            <text
              x={(cc.center.x + pts[1].x) / 2 + 8}
              y={(cc.center.y + pts[1].y) / 2}
              fontFamily="JetBrains Mono, monospace"
              fontSize="14"
              fill="#ffd98a">
              R = {rInches.toFixed(1)} in
            </text>
          </>
        )}
        {straight && (
          <line x1={pts[0].x} y1={pts[0].y} x2={pts[2].x} y2={pts[2].y} stroke="#5ce08a" strokeWidth="3" strokeLinecap="round" />
        )}

        {/* arc through the three points (the local path) */}
        <polyline
          points={pts.map((p) => `${p.x},${p.y}`).join(' ')}
          fill="none"
          stroke="#2a3656"
          strokeWidth="2"
          strokeDasharray="5 6"
        />

        {/* the three draggable points */}
        {pts.map((p, i) => (
          <g key={i}>
            <circle
              cx={p.x}
              cy={p.y}
              r="11"
              fill="#16203a"
              stroke="#ff6f9c"
              strokeWidth="3"
              style={{cursor: 'grab'}}
              onPointerDown={(e) => {
                drag.current = i;
                (e.target as Element).setPointerCapture(e.pointerId);
              }}
            />
            <text x={p.x} y={p.y - 16} textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="14" fill="#ffa8c4">
              {LABELS[i]}
            </text>
          </g>
        ))}
      </svg>

      <Buttons>
        <Button
          onClick={() =>
            setPts([
              {x: 150, y: 250},
              {x: 320, y: 110},
              {x: 490, y: 250},
            ])
          }>
          Reset
        </Button>
        <Button
          onClick={() =>
            setPts([
              {x: 120, y: 200},
              {x: 320, y: 200},
              {x: 520, y: 200},
            ])
          }>
          Make collinear (κ → 0)
        </Button>
      </Buttons>

      <Readout
        items={[
          ['radius R', straight ? '∞ (straight)' : `${rInches.toFixed(1)} in`],
          ['curvature κ = 1/R', straight ? '0.000' : kappa.toFixed(4)],
          ['tighter turn ⇒', 'smaller R, bigger κ'],
        ]}
      />
      <Legend
        items={[
          {color: '#ff6f9c', label: 'path points P, Q, R'},
          {color: '#6f8bff', label: 'circle through them'},
          {color: '#ffc24d', label: 'radius R'},
        ]}
      />
    </Demo>
  );
}

export default CurvatureCircle;
