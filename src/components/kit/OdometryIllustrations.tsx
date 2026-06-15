import type {ReactNode} from 'react';

/* Odometry-specific figures. Static, deeply-laid-out SVGs (no canvas, no state)
   so they render identically on server and client. Imported directly by
   docs/localization-odometry/odometry.mdx (not registered globally) because they
   are specific to that lesson.

   Layout rules that keep them readable when projected:
   - Arrowheads use markerUnits="userSpaceOnUse" so they stay a fixed size
     instead of scaling with the (thick) stroke width.
   - Geometry is computed, never hand-placed, so labels match the picture.
   - Long equations live in a side legend, away from the drawing, so nothing
     overlaps the lines. Labels on the drawing itself stay short. */

const INK = '#e8eefc';
const MUTED = '#8294b8';
const GRID = '#31405f';
const BLUE = '#6f8bff';
const GREEN = '#5ce08a';
const AMBER = '#ffc24d';
const ROSE = '#ff6f9c';
const MONO = 'JetBrains Mono, monospace';

function Figure({title, caption, children}: {title: string; caption: string; children: ReactNode}) {
  return (
    <figure className="not-prose my-7 overflow-hidden rounded-xl border border-line bg-surface shadow-card">
      <div className="bg-panel px-4 py-5 text-panel-ink">{children}</div>
      <figcaption className="border-t border-line bg-surface-2 px-4 py-3 text-[0.95rem] leading-relaxed text-ink-soft">
        <strong className="text-ink">{title}</strong> — {caption}
      </figcaption>
    </figure>
  );
}

const rad = (deg: number) => (deg * Math.PI) / 180;

/** A point on a circle centred at (cx,cy) at screen-angle `deg` (y points down). */
function onCircle(cx: number, cy: number, r: number, deg: number): [number, number] {
  return [cx + r * Math.cos(rad(deg)), cy + r * Math.sin(rad(deg))];
}

function polyline(points: [number, number][]): string {
  return points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
}

/** Sample a circular arc between two screen-angles into a polyline path. */
function arcPath(cx: number, cy: number, r: number, a0: number, a1: number, n = 44): string {
  const pts: [number, number][] = Array.from({length: n}, (_, i) => onCircle(cx, cy, r, a0 + (i / (n - 1)) * (a1 - a0)));
  return polyline(pts);
}

/* Fixed-size arrowheads (userSpaceOnUse => independent of stroke width). */
function ArrowDefs() {
  const heads: [string, string][] = [
    ['odoBlue', BLUE],
    ['odoGreen', GREEN],
    ['odoAmber', AMBER],
    ['odoRose', ROSE],
    ['odoGray', MUTED],
  ];
  return (
    <defs>
      {heads.map(([id, fill]) => (
        <marker key={id} id={id} markerUnits="userSpaceOnUse" markerWidth="15" markerHeight="15" refX="12" refY="7" orient="auto" viewBox="0 0 15 15">
          <path d="M0 1 L14 7 L0 13 Z" fill={fill} />
        </marker>
      ))}
    </defs>
  );
}

/* ---------------------------------------------------------------------------
   Figure 1 — the big picture: a turning robot follows an arc, so integrating
   it as a straight step "cuts the corner" and leaves drift every loop.
   --------------------------------------------------------------------------- */
export function ArcStepIllustration() {
  const C: [number, number] = [250, 520]; // centre of curvature, below the frame
  const R = 320;
  const a0 = -37; // start angle (screen degrees)
  const a1 = -70; // end angle — robot turns through |a0 - a1|

  const P0 = onCircle(C[0], C[1], R, a0);
  const P1 = onCircle(C[0], C[1], R, a1);
  const hx = Math.sin(rad(a0)); // unit heading at the start (direction of travel)
  const hy = -Math.cos(rad(a0));
  const arcPx = Math.abs(rad(a0 - a1)) * R;
  const Pn: [number, number] = [P0[0] + arcPx * hx, P0[1] + arcPx * hy]; // straight guess
  const hTip: [number, number] = [P0[0] + 66 * hx, P0[1] + 66 * hy];
  const mid: [number, number] = onCircle(C[0], C[1], R, (a0 + a1) / 2);

  return (
    <Figure
      title="A turning robot follows an arc, not a line"
      caption="The green arc is where the robot actually goes. Pretending it stepped straight along its old heading (rose) overshoots the arc; that gap, repeated every loop, is dead-reckoning drift.">
      <svg viewBox="0 0 720 340" role="img" aria-label="True arc versus straight-line approximation" className="h-auto w-full">
        <rect width="720" height="340" rx="16" fill="#0b1120" />
        <ArrowDefs />

        {/* naive straight step */}
        <line x1={P0[0]} y1={P0[1]} x2={Pn[0]} y2={Pn[1]} stroke={ROSE} strokeWidth="3" strokeDasharray="11 8" strokeLinecap="round" markerEnd="url(#odoRose)" />
        <text x={Pn[0]} y={Pn[1] - 18} fill={ROSE} fontFamily={MONO} fontSize="16" textAnchor="middle">straight-step guess</text>

        {/* true arc */}
        <path d={arcPath(C[0], C[1], R, a0, a1)} fill="none" stroke={GREEN} strokeWidth="5" strokeLinecap="round" markerEnd="url(#odoGreen)" />
        <text x={mid[0] + 150} y={mid[1] + 40} fill={GREEN} fontFamily={MONO} fontSize="16" textAnchor="middle">true path (arc)</text>

        {/* per-loop error gap */}
        <line x1={P1[0]} y1={P1[1]} x2={Pn[0]} y2={Pn[1]} stroke="#ffffff" strokeWidth="2" strokeDasharray="3 5" opacity="0.85" />
        <text x={(P1[0] + Pn[0]) / 2 - 18} y={(P1[1] + Pn[1]) / 2} fill="#ffffff" fontFamily={MONO} fontSize="15" textAnchor="end" opacity="0.9">drift</text>

        {/* start pose + heading */}
        <line x1={P0[0]} y1={P0[1]} x2={hTip[0]} y2={hTip[1]} stroke={MUTED} strokeWidth="3" markerEnd="url(#odoGray)" />
        <circle cx={P0[0]} cy={P0[1]} r="8" fill={BLUE} />
        <text x={P0[0] + 16} y={P0[1] + 8} fill={BLUE} fontFamily={MONO} fontSize="16">start pose</text>

        {/* end pose */}
        <circle cx={P1[0]} cy={P1[1]} r="8" fill={GREEN} />
        <text x={P1[0] - 16} y={P1[1] + 6} fill={GREEN} fontFamily={MONO} fontSize="16" textAnchor="end">true end</text>
      </svg>
    </Figure>
  );
}

/* ---------------------------------------------------------------------------
   Figure 2 — the exact arc geometry in the robot's own frame, with the two
   component equations in a side legend so they never cross the drawing.
   --------------------------------------------------------------------------- */
export function ArcGeometryIllustration() {
  const O: [number, number] = [150, 300]; // start pose = robot-frame origin
  const R = 250;
  const C: [number, number] = [O[0], O[1] - R]; // turn centre, directly "left" (+y)
  const dThetaDeg = 42;
  const aStart = 90; // O sits straight below the centre
  const aEnd = 90 - dThetaDeg;
  const E = onCircle(C[0], C[1], R, aEnd);
  const corner: [number, number] = [E[0], O[1]];
  const rMid: [number, number] = [(C[0] + E[0]) / 2, (C[1] + E[1]) / 2];

  const Lx = 430; // legend column x
  return (
    <Figure
      title="One arc step, decomposed in the robot's frame"
      caption="Sweeping angle dθ on a circle of radius R = ds/dθ moves the robot forward by R·sin dθ and sideways by R·(1 − cos dθ). Substituting R = ds/dθ turns those into the sin(dθ)/dθ and (1 − cos dθ)/dθ factors the code calls sinC and cosC.">
      <svg viewBox="0 0 720 340" role="img" aria-label="Forward and lateral components of one constant-curvature arc step" className="h-auto w-full">
        <rect width="720" height="340" rx="16" fill="#0b1120" />
        <ArrowDefs />

        {/* radii to the turn centre */}
        <line x1={C[0]} y1={C[1]} x2={O[0]} y2={O[1]} stroke={GRID} strokeWidth="2" strokeDasharray="7 6" />
        <line x1={C[0]} y1={C[1]} x2={E[0]} y2={E[1]} stroke={GRID} strokeWidth="2" strokeDasharray="7 6" />
        <circle cx={C[0]} cy={C[1]} r="5" fill={MUTED} />
        <text x={C[0]} y={C[1] - 14} fill={MUTED} fontFamily={MONO} fontSize="15" textAnchor="middle">turn center</text>
        <text x={rMid[0] + 12} y={rMid[1] - 4} fill={MUTED} fontFamily={MONO} fontSize="16">R = ds/dθ</text>

        {/* dθ wedge at the centre */}
        <path d={arcPath(C[0], C[1], 56, aStart, aEnd, 24)} fill="none" stroke={AMBER} strokeWidth="3" />
        <text x={C[0] + 22} y={C[1] + 86} fill={AMBER} fontFamily={MONO} fontSize="17">dθ</text>

        {/* the arc */}
        <path d={arcPath(C[0], C[1], R, aStart, aEnd)} fill="none" stroke={GREEN} strokeWidth="5" strokeLinecap="round" />

        {/* forward leg Δx, lateral leg Δy */}
        <line x1={O[0]} y1={O[1]} x2={corner[0] - 4} y2={corner[1]} stroke={AMBER} strokeWidth="4" strokeLinecap="round" markerEnd="url(#odoAmber)" />
        <line x1={corner[0]} y1={corner[1]} x2={E[0]} y2={E[1] + 4} stroke={GREEN} strokeWidth="4" strokeLinecap="round" markerEnd="url(#odoGreen)" />
        <text x={(O[0] + corner[0]) / 2} y={O[1] + 26} fill={AMBER} fontFamily={MONO} fontSize="16" textAnchor="middle">Δx</text>
        <text x={corner[0] + 12} y={(corner[1] + E[1]) / 2 + 6} fill={GREEN} fontFamily={MONO} fontSize="16">Δy</text>

        {/* start + end poses */}
        <circle cx={O[0]} cy={O[1]} r="8" fill={BLUE} />
        <text x={O[0] - 14} y={O[1] + 26} fill={BLUE} fontFamily={MONO} fontSize="16" textAnchor="middle">start</text>
        <circle cx={E[0]} cy={E[1]} r="8" fill={GREEN} />
        <text x={E[0] + 14} y={E[1] - 8} fill={GREEN} fontFamily={MONO} fontSize="16">end</text>

        {/* side legend: the component equations, off the drawing */}
        <line x1={Lx} y1={150} x2={Lx + 26} y2={150} stroke={AMBER} strokeWidth="5" strokeLinecap="round" />
        <text x={Lx + 36} y={155} fill={INK} fontFamily={MONO} fontSize="16">Δx (forward)</text>
        <text x={Lx + 36} y={181} fill={MUTED} fontFamily={MONO} fontSize="15">= R·sin dθ = ds·sinC</text>
        <line x1={Lx} y1={222} x2={Lx + 26} y2={222} stroke={GREEN} strokeWidth="5" strokeLinecap="round" />
        <text x={Lx + 36} y={227} fill={INK} fontFamily={MONO} fontSize="16">Δy (sideways)</text>
        <text x={Lx + 36} y={253} fill={MUTED} fontFamily={MONO} fontSize="15">= R·(1−cos dθ) = ds·cosC</text>
      </svg>
    </Figure>
  );
}

/* ---------------------------------------------------------------------------
   Figure 3 — recovering an angle from a displacement with atan2.
   --------------------------------------------------------------------------- */
export function Atan2Illustration() {
  const O: [number, number] = [230, 240]; // robot / origin
  const T: [number, number] = [560, 110]; // target
  const dy = T[1] - O[1];
  const dx = T[0] - O[0];
  const corner: [number, number] = [T[0], O[1]];
  const thetaDeg = (Math.atan2(-dy, dx) * 180) / Math.PI; // math-convention angle (y up)
  const aEnd = -thetaDeg; // screen angle for the annotation arc
  const arcR = 72;

  return (
    <Figure
      title="atan2(Δy, Δx): a displacement becomes a heading"
      caption="To face a point, you need the angle of the vector to it. atan2 reads the signs of both Δx and Δy to pick the right one of four quadrants and returns the full −π … π range — something atan(Δy/Δx) cannot.">
      <svg viewBox="0 0 720 320" role="img" aria-label="atan2 recovering a heading angle from delta x and delta y" className="h-auto w-full">
        <rect width="720" height="320" rx="16" fill="#0b1120" />
        <ArrowDefs />

        {/* axes through the robot */}
        <line x1="80" y1={O[1]} x2="650" y2={O[1]} stroke={GRID} strokeWidth="2" />
        <line x1={O[0]} y1="44" x2={O[0]} y2="292" stroke={GRID} strokeWidth="2" />
        <text x="650" y={O[1] - 12} fill={MUTED} fontFamily={MONO} fontSize="15">+x</text>
        <text x={O[0] + 12} y="56" fill={MUTED} fontFamily={MONO} fontSize="15">+y</text>

        {/* right-triangle legs */}
        <line x1={O[0]} y1={O[1]} x2={corner[0]} y2={corner[1]} stroke={AMBER} strokeWidth="3" strokeDasharray="9 6" />
        <line x1={corner[0]} y1={corner[1]} x2={T[0]} y2={T[1]} stroke={GREEN} strokeWidth="3" strokeDasharray="9 6" />
        <text x={(O[0] + corner[0]) / 2} y={O[1] + 26} fill={AMBER} fontFamily={MONO} fontSize="16" textAnchor="middle">Δx</text>
        <text x={corner[0] + 14} y={(corner[1] + T[1]) / 2 + 6} fill={GREEN} fontFamily={MONO} fontSize="16">Δy</text>

        {/* displacement vector */}
        <line x1={O[0]} y1={O[1]} x2={T[0]} y2={T[1]} stroke={BLUE} strokeWidth="5" strokeLinecap="round" markerEnd="url(#odoBlue)" />

        {/* theta annotation arc */}
        <path d={arcPath(O[0], O[1], arcR, 0, aEnd, 24)} fill="none" stroke={ROSE} strokeWidth="3.5" />
        <text x={O[0] + 92} y={O[1] - 20} fill={ROSE} fontFamily={MONO} fontSize="17">θ = atan2(Δy, Δx)</text>

        {/* robot + target */}
        <circle cx={O[0]} cy={O[1]} r="9" fill={BLUE} />
        <text x={O[0]} y={O[1] + 32} fill={INK} fontFamily={MONO} fontSize="16" textAnchor="middle">robot</text>
        <circle cx={T[0]} cy={T[1]} r="9" fill={AMBER} />
        <text x={T[0] + 14} y={T[1] - 2} fill={AMBER} fontFamily={MONO} fontSize="16">target</text>

        {/* note */}
        <text x={O[0]} y="300" fill={MUTED} fontFamily={MONO} fontSize="14">atan2 keeps both signs ⇒ correct quadrant</text>
      </svg>
    </Figure>
  );
}
