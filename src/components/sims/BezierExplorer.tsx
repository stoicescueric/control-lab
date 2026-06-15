import {useRef, useState} from 'react';
import {Demo, Controls, Buttons, Button, Readout, Legend} from '@site/src/components/kit/Demo';
import {Slider} from '@site/src/components/kit/Slider';

/* Interactive cubic Bézier. Drag the four control points; scrub t to watch the
   de Casteljau construction; toggle the curvature comb. Pure React + SVG, so it
   is SSR-safe — pointer geometry is only read inside event handlers. */

const W = 640;
const H = 360;

type Pt = {x: number; y: number};
const lerp = (a: Pt, b: Pt, t: number): Pt => ({x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t});
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

// cubic Bézier value and derivatives at t
function bez(p: Pt[], t: number): Pt {
  const u = 1 - t;
  return {
    x: u * u * u * p[0].x + 3 * u * u * t * p[1].x + 3 * u * t * t * p[2].x + t * t * t * p[3].x,
    y: u * u * u * p[0].y + 3 * u * u * t * p[1].y + 3 * u * t * t * p[2].y + t * t * t * p[3].y,
  };
}
function dbez(p: Pt[], t: number): Pt {
  const u = 1 - t;
  return {
    x: 3 * u * u * (p[1].x - p[0].x) + 6 * u * t * (p[2].x - p[1].x) + 3 * t * t * (p[3].x - p[2].x),
    y: 3 * u * u * (p[1].y - p[0].y) + 6 * u * t * (p[2].y - p[1].y) + 3 * t * t * (p[3].y - p[2].y),
  };
}
function ddbez(p: Pt[], t: number): Pt {
  const u = 1 - t;
  return {
    x: 6 * u * (p[2].x - 2 * p[1].x + p[0].x) + 6 * t * (p[3].x - 2 * p[2].x + p[1].x),
    y: 6 * u * (p[2].y - 2 * p[1].y + p[0].y) + 6 * t * (p[3].y - 2 * p[2].y + p[1].y),
  };
}
function curvature(d: Pt, dd: Pt): number {
  const denom = Math.pow(d.x * d.x + d.y * d.y, 1.5);
  return denom < 1e-6 ? 0 : (d.x * dd.y - d.y * dd.x) / denom;
}

export function BezierExplorer() {
  const svgRef = useRef<SVGSVGElement>(null);
  const drag = useRef<number | null>(null);
  const [pts, setPts] = useState<Pt[]>([
    {x: 80, y: 300},
    {x: 210, y: 70},
    {x: 440, y: 70},
    {x: 575, y: 300},
  ]);
  const [t, setT] = useState(0.42);
  const [comb, setComb] = useState(true);

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

  // curve path
  const curve = Array.from({length: 90}, (_, i) => bez(pts, i / 89));
  const d = `M ${curve.map((p) => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' L ')}`;

  // de Casteljau at t
  const a = lerp(pts[0], pts[1], t);
  const b = lerp(pts[1], pts[2], t);
  const c = lerp(pts[2], pts[3], t);
  const ab = lerp(a, b, t);
  const bc = lerp(b, c, t);
  const onCurve = lerp(ab, bc, t);

  // curvature comb
  const combHairs = comb
    ? Array.from({length: 46}, (_, i) => {
        const tt = i / 45;
        const p = bez(pts, tt);
        const dv = dbez(pts, tt);
        const k = curvature(dv, ddbez(pts, tt));
        const len = Math.hypot(dv.x, dv.y) || 1;
        const nx = -dv.y / len;
        const ny = dv.x / len;
        const h = clamp(k * 5200, -70, 70);
        return {x1: p.x, y1: p.y, x2: p.x + nx * h, y2: p.y + ny * h};
      })
    : [];

  const tan0 = dbez(pts, 0);
  const k0 = Math.hypot(tan0.x, tan0.y);

  return (
    <Demo title="Cubic Bézier: drag the control points">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="block h-auto w-full touch-none rounded-xl bg-[#0b1120]"
        role="img"
        aria-label="Interactive cubic Bézier curve editor"
        onPointerMove={onMove}
        onPointerUp={() => (drag.current = null)}
        onPointerLeave={() => (drag.current = null)}>
        {/* control polygon */}
        <polyline points={pts.map((p) => `${p.x},${p.y}`).join(' ')} fill="none" stroke="#3b4a6b" strokeWidth="2" strokeDasharray="7 7" />

        {/* curvature comb */}
        {combHairs.map((h, i) => (
          <line key={i} x1={h.x1} y1={h.y1} x2={h.x2} y2={h.y2} stroke="#5ce08a" strokeWidth="1.5" opacity="0.5" />
        ))}

        {/* the curve */}
        <path d={d} fill="none" stroke="#6f8bff" strokeWidth="4" strokeLinecap="round" />

        {/* de Casteljau scaffold at t */}
        <g opacity="0.9">
          <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#8294b8" strokeWidth="1.5" />
          <line x1={b.x} y1={b.y} x2={c.x} y2={c.y} stroke="#8294b8" strokeWidth="1.5" />
          <line x1={ab.x} y1={ab.y} x2={bc.x} y2={bc.y} stroke="#ffc24d" strokeWidth="2" />
          {[a, b, c].map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r="3.5" fill="#8294b8" />
          ))}
          <circle cx={onCurve.x} cy={onCurve.y} r="6.5" fill="#ffffff" />
        </g>

        {/* control points (draggable) */}
        {pts.map((p, i) => {
          const isAnchor = i === 0 || i === 3;
          return (
            <g key={i}>
              <circle
                cx={p.x}
                cy={p.y}
                r="11"
                fill={isAnchor ? '#6f8bff' : '#ffc24d'}
                stroke="#0b1120"
                strokeWidth="2"
                style={{cursor: 'grab'}}
                onPointerDown={(e) => {
                  drag.current = i;
                  (e.target as Element).setPointerCapture(e.pointerId);
                }}
              />
              <text x={p.x} y={p.y - 16} textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="13" fill={isAnchor ? '#9db0ff' : '#ffd98a'}>
                P{i}
              </text>
            </g>
          );
        })}
      </svg>

      <Controls>
        <Slider label="Parameter t" min={0} max={1} step={0.01} value={t} onChange={setT} format={(v) => v.toFixed(2)} />
      </Controls>
      <Buttons>
        <Button active={comb} onClick={() => setComb((v) => !v)}>
          Curvature comb
        </Button>
        <Button
          onClick={() =>
            setPts([
              {x: 80, y: 300},
              {x: 210, y: 70},
              {x: 440, y: 70},
              {x: 575, y: 300},
            ])
          }>
          Reset
        </Button>
      </Buttons>
      <Readout
        items={[
          ['B(t)', `(${onCurve.x.toFixed(0)}, ${onCurve.y.toFixed(0)})`],
          ['start tangent |3(P₁−P₀)|', k0.toFixed(0)],
          ['passes through', 'P₀ and P₃ only'],
        ]}
      />
      <Legend
        items={[
          {color: '#6f8bff', label: 'anchors P₀, P₃ (on curve)'},
          {color: '#ffc24d', label: 'handles P₁, P₂ (pull only)'},
          {color: '#5ce08a', label: 'curvature comb'},
        ]}
      />
    </Demo>
  );
}

export default BezierExplorer;
