import {useRef, useState} from 'react';
import {Demo, Stage, Controls, Buttons, Button, Readout, Legend} from '@site/src/components/kit/Demo';
import {Slider} from '@site/src/components/kit/Slider';

/* Adaptive pure pursuit velocity planning, made live. Drag the waypoints to
   reshape the path; the demo densifies it (Catmull-Rom), measures curvature at
   every point, caps speed where it bends (k / curvature), then runs the BACKWARD
   braking pass so the robot can always stop at the end. The path is tinted by the
   final planned speed (green fast -> red slow); the right plot shows the raw cap
   (blue) versus the braking-limited profile (orange). Pure React + SVG, SSR-safe. */

const W = 640;
const H = 360;
const FIELD = 144; // canvas width = 12 ft (144 in) field
const SCALE = FIELD / W; // inches per pixel
const V_AXIS = 90; // top of the speed axis (in/s)

type Pt = {x: number; y: number};
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y);

function catmull(p: Pt[], perSeg: number): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i < p.length - 1; i++) {
    const p0 = p[i - 1] ?? p[i];
    const p1 = p[i];
    const p2 = p[i + 1];
    const p3 = p[i + 2] ?? p[i + 1];
    for (let s = 0; s < perSeg; s++) {
      const t = s / perSeg;
      const t2 = t * t;
      const t3 = t2 * t;
      out.push({
        x: 0.5 * (2 * p1.x + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
        y: 0.5 * (2 * p1.y + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
      });
    }
  }
  out.push(p[p.length - 1]);
  return out;
}

// Menger curvature (1/in) of three points given in inch coordinates.
function curvatureInches(A: Pt, B: Pt, C: Pt): number {
  const area = 0.5 * Math.abs((B.x - A.x) * (C.y - A.y) - (C.x - A.x) * (B.y - A.y));
  const a = dist(B, C);
  const b = dist(A, C);
  const c = dist(A, B);
  const denom = a * b * c;
  return denom < 1e-6 ? 0 : (4 * area) / denom;
}

const INIT: Pt[] = [
  {x: 70, y: 290},
  {x: 200, y: 80},
  {x: 330, y: 300},
  {x: 470, y: 90},
  {x: 580, y: 280},
];

export function VelocityProfile() {
  const svgRef = useRef<SVGSVGElement>(null);
  const drag = useRef<number | null>(null);
  const [wp, setWp] = useState<Pt[]>(INIT);
  const [vPath, setVPath] = useState(60);
  const [kCurv, setKCurv] = useState(3);
  const [aMax, setAMax] = useState(55);

  const toSvg = (e: React.PointerEvent): Pt => {
    const r = svgRef.current!.getBoundingClientRect();
    return {x: ((e.clientX - r.left) * W) / r.width, y: ((e.clientY - r.top) * H) / r.height};
  };
  const onMove = (e: React.PointerEvent) => {
    if (drag.current == null) return;
    const p = toSvg(e);
    const i = drag.current;
    setWp((prev) => prev.map((q, j) => (j === i ? {x: clamp(p.x, 14, W - 14), y: clamp(p.y, 14, H - 14)} : q)));
  };

  // densify, then work in inch coordinates for the physics
  const dense = catmull(wp, 34);
  const n = dense.length;
  const inch = dense.map((p) => ({x: p.x * SCALE, y: p.y * SCALE}));

  // cumulative distance (inches)
  const s = new Array(n).fill(0);
  for (let i = 1; i < n; i++) s[i] = s[i - 1] + dist(inch[i - 1], inch[i]);
  const total = s[n - 1] || 1;

  // curvature (gap neighbours to tame Catmull-Rom noise), then the speed cap
  const g = 3;
  const cap = new Array(n).fill(vPath);
  for (let i = g; i < n - g; i++) {
    const k = curvatureInches(inch[i - g], inch[i], inch[i + g]);
    cap[i] = k < 1e-5 ? vPath : Math.min(vPath, kCurv / k);
  }
  // backward braking pass: v_i <= sqrt(v_{i+1}^2 + 2 a d)
  const v = cap.slice();
  v[n - 1] = 0;
  for (let i = n - 2; i >= 0; i--) {
    const d = s[i + 1] - s[i];
    v[i] = Math.min(v[i], Math.sqrt(v[i + 1] * v[i + 1] + 2 * aMax * d));
  }

  const minV = Math.min(...v.slice(0, n - 1));

  // path tinted by final speed
  const speedColor = (val: number) => `hsl(${clamp((val / vPath) * 135, 0, 135)}, 78%, 58%)`;

  // right-panel plot geometry
  const PX0 = 64;
  const PX1 = W - 24;
  const PY0 = H - 50; // v = 0
  const PYTOP = 40;
  const px = (d: number) => PX0 + (d / total) * (PX1 - PX0);
  const py = (val: number) => PY0 - (val / V_AXIS) * (PY0 - PYTOP);
  const line = (arr: number[]) => arr.map((val, i) => `${i === 0 ? 'M' : 'L'} ${px(s[i]).toFixed(1)} ${py(val).toFixed(1)}`).join(' ');

  return (
    <Demo title="Adaptive velocity planning: drag the path, watch the speed adapt">
      <Stage split>
        {/* LEFT: the path, tinted by planned speed */}
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          className="block h-auto w-full touch-none rounded-xl bg-[#0b1120]"
          role="img"
          aria-label="Robot path tinted by the planned speed at each point"
          onPointerMove={onMove}
          onPointerUp={() => (drag.current = null)}
          onPointerLeave={() => (drag.current = null)}>
          {dense.slice(0, n - 1).map((p, i) => (
            <line key={i} x1={p.x} y1={p.y} x2={dense[i + 1].x} y2={dense[i + 1].y} stroke={speedColor(v[i])} strokeWidth="6" strokeLinecap="round" />
          ))}
          {wp.map((p, i) => (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r="10"
              fill="#16203a"
              stroke="#cfe0ff"
              strokeWidth="2.5"
              style={{cursor: 'grab'}}
              onPointerDown={(e) => {
                drag.current = i;
                (e.target as Element).setPointerCapture(e.pointerId);
              }}
            />
          ))}
          <text x="16" y="28" fontFamily="JetBrains Mono, monospace" fontSize="13" fill="#8294b8">
            drag the waypoints
          </text>
        </svg>

        {/* RIGHT: speed vs distance — cap and braking-limited profile */}
        <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full rounded-xl bg-[#0b1120]" role="img" aria-label="Speed versus distance along the path">
          {/* axes */}
          <line x1={PX0} y1={PY0} x2={PX1} y2={PY0} stroke="#31405f" strokeWidth="1.5" />
          <line x1={PX0} y1={PY0} x2={PX0} y2={PYTOP} stroke="#31405f" strokeWidth="1.5" />
          {/* max-speed line */}
          <line x1={PX0} y1={py(vPath)} x2={PX1} y2={py(vPath)} stroke="#8294b8" strokeWidth="1.5" strokeDasharray="2 8" />
          <text x={PX1} y={py(vPath) - 8} textAnchor="end" fontFamily="JetBrains Mono, monospace" fontSize="12" fill="#8294b8">
            v_path
          </text>
          {/* curvature cap */}
          <path d={line(cap)} fill="none" stroke="#6f8bff" strokeWidth="2.5" opacity="0.8" />
          {/* braking-limited */}
          <path d={line(v)} fill="none" stroke="#ffc24d" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
          <text x={PX0 - 8} y={PYTOP + 4} textAnchor="end" fontFamily="JetBrains Mono, monospace" fontSize="12" fill="#8294b8">
            v
          </text>
          <text x={(PX0 + PX1) / 2} y={H - 18} textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="12" fill="#8294b8">
            distance along path →
          </text>
        </svg>
      </Stage>

      <Controls>
        <Slider label="Path max speed v_path" min={20} max={80} step={5} value={vPath} onChange={setVPath} format={(x) => `${x.toFixed(0)} in/s`} />
        <Slider label="Turn caution k" min={1} max={5} step={0.25} value={kCurv} onChange={setKCurv} format={(x) => x.toFixed(2)} />
        <Slider label="Max decel a" min={20} max={120} step={5} value={aMax} onChange={setAMax} format={(x) => `${x.toFixed(0)} in/s²`} />
      </Controls>
      <Buttons>
        <Button onClick={() => setWp(INIT)}>Reset path</Button>
      </Buttons>
      <Readout
        items={[
          ['path length', `${total.toFixed(0)} in`],
          ['slowest point', `${minV.toFixed(1)} in/s`],
          ['ends at', '0 in/s (backward pass)'],
        ]}
      />
      <Legend
        items={[
          {color: '#6f8bff', label: 'curvature speed cap'},
          {color: '#ffc24d', label: 'after backward braking pass'},
          {color: '#5ce08a', label: 'path: fast (drag a tight turn to see red)'},
        ]}
      />
    </Demo>
  );
}

export default VelocityProfile;
