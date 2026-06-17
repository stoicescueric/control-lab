import {useRef, useState} from 'react';
import {Demo, Controls, Buttons, Button, Readout, Legend} from '@site/src/components/kit/Demo';
import {Slider} from '@site/src/components/kit/Slider';

/* The guiding vector field made visible. A cubic Bezier path (drag its four
   control points) induces a field of arrows: at every point the field is the
   path tangent MINUS a pull toward the path proportional to the signed
   cross-track error -- chi = t_hat - kN * e * n_hat, normalized. Drag the robot
   anywhere and its flow line (integrate the field forward) curves onto the path
   and rides it to the end, from any start and any side. That is the convergence
   guarantee, drawn. Pure React + SVG, SSR-safe (pointers read only in handlers). */

const W = 640;
const H = 380;
const FIELD = 144; // canvas width = 12 ft (144 in) field
const SCALE = FIELD / W; // inches per pixel

type Pt = {x: number; y: number};
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

// cubic Bezier position / derivative at parameter t in [0,1]
function bez(P: Pt[], t: number): Pt {
  const u = 1 - t;
  const a = u * u * u,
    b = 3 * u * u * t,
    c = 3 * u * t * t,
    d = t * t * t;
  return {x: a * P[0].x + b * P[1].x + c * P[2].x + d * P[3].x, y: a * P[0].y + b * P[1].y + c * P[2].y + d * P[3].y};
}
// closest point on the path to q (dense sample), returns point + unit tangent + signed cross-track error (inches)
function project(samples: Pt[], tans: Pt[], q: Pt) {
  let bi = 0;
  let bd = Infinity;
  for (let i = 0; i < samples.length; i++) {
    const dx = samples[i].x - q.x;
    const dy = samples[i].y - q.y;
    const d = dx * dx + dy * dy;
    if (d < bd) {
      bd = d;
      bi = i;
    }
  }
  const c = samples[bi];
  const t = tans[bi];
  // normal = tangent rotated +90deg
  const nx = -t.y;
  const ny = t.x;
  const e = ((q.x - c.x) * nx + (q.y - c.y) * ny) * SCALE; // inches, signed
  return {c, tx: t.x, ty: t.y, nx, ny, e, i: bi};
}

// guiding-vector-field direction (unit) at q
function field(samples: Pt[], tans: Pt[], q: Pt, kN: number) {
  const {tx, ty, nx, ny, e} = project(samples, tans, q);
  let vx = tx - kN * e * nx;
  let vy = ty - kN * e * ny;
  const m = Math.hypot(vx, vy) || 1;
  return {x: vx / m, y: vy / m, e};
}

const INIT: Pt[] = [
  {x: 70, y: 300},
  {x: 200, y: 70},
  {x: 430, y: 330},
  {x: 580, y: 90},
];

export function GuidedVectorField() {
  const svgRef = useRef<SVGSVGElement>(null);
  const drag = useRef<string | null>(null);
  const [P, setP] = useState<Pt[]>(INIT);
  const [robot, setRobot] = useState<Pt>({x: 120, y: 120});
  const [kN, setKN] = useState(0.5);
  const [showGrid, setShowGrid] = useState(true);

  const toSvg = (e: React.PointerEvent): Pt => {
    const r = svgRef.current!.getBoundingClientRect();
    return {x: ((e.clientX - r.left) * W) / r.width, y: ((e.clientY - r.top) * H) / r.height};
  };
  const onMove = (e: React.PointerEvent) => {
    if (drag.current == null) return;
    const p = {x: clamp(toSvg(e).x, 8, W - 8), y: clamp(toSvg(e).y, 8, H - 8)};
    if (drag.current === 'robot') setRobot(p);
    else {
      const i = +drag.current;
      setP((prev) => prev.map((q, j) => (j === i ? p : q)));
    }
  };

  // dense path samples + unit tangents (recomputed per render)
  const N = 200;
  const samples: Pt[] = [];
  const tans: Pt[] = [];
  for (let k = 0; k <= N; k++) {
    const t = k / N;
    samples.push(bez(P, t));
    // numeric tangent (robust for any control polygon)
    const a = bez(P, Math.max(0, t - 0.004));
    const b = bez(P, Math.min(1, t + 0.004));
    const dx = b.x - a.x,
      dy = b.y - a.y;
    const m = Math.hypot(dx, dy) || 1;
    tans.push({x: dx / m, y: dy / m});
  }
  const pathStr = `M ${P[0].x} ${P[0].y} C ${P[1].x} ${P[1].y}, ${P[2].x} ${P[2].y}, ${P[3].x} ${P[3].y}`;

  // grid of field arrows
  const arrows: {x: number; y: number; dx: number; dy: number; e: number}[] = [];
  if (showGrid) {
    const step = 46;
    for (let gx = step / 2; gx < W; gx += step) {
      for (let gy = step / 2; gy < H; gy += step) {
        const f = field(samples, tans, {x: gx, y: gy}, kN);
        arrows.push({x: gx, y: gy, dx: f.x, dy: f.y, e: f.e});
      }
    }
  }

  // robot flow line: integrate the field forward until we reach the path end
  const flow: Pt[] = [robot];
  let cur = robot;
  const end = samples[N];
  for (let s = 0; s < 360; s++) {
    const f = field(samples, tans, cur, kN);
    cur = {x: cur.x + f.x * 4, y: cur.y + f.y * 4};
    flow.push(cur);
    if (Math.hypot(cur.x - end.x, cur.y - end.y) < 10) break;
    if (cur.x < -20 || cur.x > W + 20 || cur.y < -20 || cur.y > H + 20) break;
  }
  const flowStr = flow.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');

  const here = field(samples, tans, robot, kN);
  const arrowColor = (e: number) => {
    const m = clamp(Math.abs(e) / 50, 0, 1); // 0 in -> teal (190), far -> blue (230)
    return `hsl(${190 + m * 40}, ${60 - m * 5}%, ${62 - m * 8}%)`;
  };

  return (
    <Demo title="The guiding vector field: drag the robot, watch it flow onto the path">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="block h-auto w-full touch-none rounded-xl bg-[#0b1120]"
        role="img"
        aria-label="A cubic path with a field of arrows; a draggable robot whose flow line curves onto the path"
        onPointerMove={onMove}
        onPointerUp={() => (drag.current = null)}
        onPointerLeave={() => (drag.current = null)}>
        {/* field arrows */}
        {arrows.map((a, i) => {
          const L = 15;
          const ex = a.x + a.dx * L;
          const ey = a.y + a.dy * L;
          const px = -a.dy;
          const py = a.dx;
          const col = arrowColor(a.e);
          return (
            <g key={i} opacity="0.7">
              <line x1={a.x} y1={a.y} x2={ex} y2={ey} stroke={col} strokeWidth="1.6" />
              <path d={`M ${ex} ${ey} L ${ex - a.dx * 5 + px * 3} ${ey - a.dy * 5 + py * 3} L ${ex - a.dx * 5 - px * 3} ${ey - a.dy * 5 - py * 3} Z`} fill={col} />
            </g>
          );
        })}

        {/* the path */}
        <path d={pathStr} fill="none" stroke="#5ce08a" strokeWidth="3.5" strokeLinecap="round" opacity="0.95" />
        {/* start / end markers */}
        <circle cx={P[0].x} cy={P[0].y} r="5" fill="#5ce08a" />
        <circle cx={P[3].x} cy={P[3].y} r="7" fill="none" stroke="#5ce08a" strokeWidth="2.5" />

        {/* robot flow line */}
        <path d={flowStr} fill="none" stroke="#ffc24d" strokeWidth="3" strokeLinecap="round" strokeDasharray="1 7" opacity="0.95" />

        {/* control-point polygon + handles */}
        <polyline points={P.map((p) => `${p.x},${p.y}`).join(' ')} fill="none" stroke="#2a3656" strokeWidth="1.5" strokeDasharray="4 5" />
        {P.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r="9"
            fill="#16203a"
            stroke="#6f8bff"
            strokeWidth="2.5"
            style={{cursor: 'grab'}}
            onPointerDown={(e) => {
              drag.current = String(i);
              (e.target as Element).setPointerCapture(e.pointerId);
            }}
          />
        ))}

        {/* the robot */}
        <circle
          cx={robot.x}
          cy={robot.y}
          r="11"
          fill="#ff6f9c"
          stroke="#fff"
          strokeWidth="2.5"
          style={{cursor: 'grab'}}
          onPointerDown={(e) => {
            drag.current = 'robot';
            (e.target as Element).setPointerCapture(e.pointerId);
          }}
        />
        <text x="16" y="28" fontFamily="JetBrains Mono, monospace" fontSize="13" fill="#8294b8">
          drag the robot (pink) anywhere
        </text>
      </svg>

      <Controls>
        <Slider label="Convergence gain kN" min={0.1} max={1.5} step={0.05} value={kN} onChange={setKN} format={(x) => `${x.toFixed(2)} /in`} />
      </Controls>
      <Buttons>
        <Button onClick={() => setShowGrid((s) => !s)} active={showGrid}>
          {showGrid ? 'Hide field arrows' : 'Show field arrows'}
        </Button>
        <Button onClick={() => setRobot({x: 120, y: 120})}>Reset robot</Button>
        <Button onClick={() => setP(INIT)}>Reset path</Button>
      </Buttons>
      <Readout
        items={[
          ['cross-track error e', `${here.e.toFixed(1)} in`],
          ['field here', `(${here.x.toFixed(2)}, ${here.y.toFixed(2)})`],
          ['low kN', 'glides in gently · high kN snaps in (overshoots)'],
        ]}
      />
      <Legend
        items={[
          {color: '#5ce08a', label: 'path (○ = end)'},
          {color: '#ff6f9c', label: 'robot', dot: true},
          {color: '#ffc24d', label: 'flow line it would follow'},
          {color: '#5a8fd0', label: 'field arrows (teal near path → blue far off)'},
          {color: '#6f8bff', label: 'Bézier control points', dot: true},
        ]}
      />
    </Demo>
  );
}

export default GuidedVectorField;
