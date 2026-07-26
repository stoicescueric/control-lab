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

/** Small top-down robot glyph rotated to its heading (screen degrees, CW). */
function RobotGlyph({x, y, rot, color, ghost = false}: {x: number; y: number; rot: number; color: string; ghost?: boolean}) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot})`} opacity={ghost ? 0.55 : 1}>
      <rect x="-19" y="-13" width="38" height="26" rx="7" fill={ghost ? 'none' : '#16203a'} stroke={color} strokeWidth="2" strokeDasharray={ghost ? '5 4' : undefined} />
      <path d="M19 -8 L30 0 L19 8 Z" fill={color} />
    </g>
  );
}

const screenDeg = (hx: number, hy: number) => (Math.atan2(hy, hx) * 180) / Math.PI;

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
        <RobotGlyph x={P0[0]} y={P0[1]} rot={screenDeg(hx, hy)} color={BLUE} />
        <text x={P0[0] + 26} y={P0[1] + 24} fill={BLUE} fontFamily={MONO} fontSize="16">start pose</text>

        {/* end pose — the robot also finished ROTATED, not just displaced */}
        <RobotGlyph x={P1[0]} y={P1[1]} rot={screenDeg(Math.sin(rad(a1)), -Math.cos(rad(a1)))} color={GREEN} />
        <text x={P1[0] - 26} y={P1[1] + 8} fill={GREEN} fontFamily={MONO} fontSize="16" textAnchor="end">true end</text>
        <RobotGlyph x={Pn[0]} y={Pn[1]} rot={screenDeg(Math.sin(rad(a1)), -Math.cos(rad(a1)))} color={ROSE} ghost />
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

        {/* start + end poses — the end robot has rotated by dθ */}
        <RobotGlyph x={O[0]} y={O[1]} rot={0} color={BLUE} />
        <text x={O[0] - 14} y={O[1] + 34} fill={BLUE} fontFamily={MONO} fontSize="16" textAnchor="middle">start</text>
        <RobotGlyph x={E[0]} y={E[1]} rot={screenDeg(Math.sin(rad(aEnd)), -Math.cos(rad(aEnd)))} color={GREEN} />
        <text x={E[0] + 26} y={E[1] - 14} fill={GREEN} fontFamily={MONO} fontSize="16">end</text>

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
   Figure 3 — three dead-wheel pods: what each one measures, and why they beat
   the drive wheels for localization.
   --------------------------------------------------------------------------- */
export function DeadWheelsIllustration() {
  const cx = 250;
  const cy = 180;
  const hw = 96; // chassis half width
  const hl = 118; // chassis half length
  const podLx = cx - 58;
  const podRx = cx + 58;
  const podY = cy - 8;
  const Lx = 470; // legend column

  /* an unpowered omni pod: small wheel with cross-rollers */
  const pod = (x: number, y: number, vertical: boolean, color: string) => (
    <g transform={`translate(${x} ${y}) rotate(${vertical ? 0 : 90})`}>
      <rect x="-9" y="-26" width="18" height="52" rx="7" fill="#101a2e" stroke={color} strokeWidth="2.5" />
      {[-16, -6, 4, 14].map((yy) => (
        <line key={yy} x1="-6" y1={yy} x2="6" y2={yy + 4} stroke={color} strokeWidth="2" opacity="0.8" />
      ))}
    </g>
  );

  return (
    <Figure
      title="Three dead wheels reconstruct the full pose"
      caption="Unpowered omni pods on light springs measure true ground motion — they can't slip the way powered drive wheels do. The two parallel pods give forward distance and heading (from their difference over the track width T); the perpendicular pod captures strafe. This is the basis of Road Runner and Pedro Pathing localization.">
      <svg viewBox="0 0 720 360" role="img" aria-label="Top-down robot with three labelled dead-wheel odometry pods" className="h-auto w-full">
        <rect width="720" height="360" rx="16" fill="#0b1120" />
        <ArrowDefs />

        {/* chassis */}
        <rect x={cx - hw} y={cy - hl} width={hw * 2} height={hl * 2} rx="18" fill="rgba(79,108,247,0.10)" stroke="#3b4a6b" strokeWidth="2.5" />
        <path d={`M ${cx - 13} ${cy - hl} L ${cx + 13} ${cy - hl} L ${cx} ${cy - hl - 15} Z`} fill={BLUE} />
        <text x={cx} y={cy - hl - 24} fill={MUTED} fontFamily={MONO} fontSize="13" textAnchor="middle">front</text>

        {/* drive wheels: faded, with the slip warning */}
        {(
          [
            [cx - hw + 4, cy - hl + 34],
            [cx + hw - 4, cy - hl + 34],
            [cx - hw + 4, cy + hl - 34],
            [cx + hw - 4, cy + hl - 34],
          ] as [number, number][]
        ).map(([wx, wy], i) => (
          <g key={i} opacity="0.4">
            <rect x={wx - 8} y={wy - 24} width="16" height="48" rx="6" fill="#31405f" />
          </g>
        ))}
        <text x={cx - hw - 12} y={cy + hl - 30} fill={MUTED} fontFamily={MONO} fontSize="12" textAnchor="end">drive wheels</text>
        <text x={cx - hw - 12} y={cy + hl - 14} fill={ROSE} fontFamily={MONO} fontSize="12" textAnchor="end">(slip — don't trust)</text>

        {/* the two parallel pods + what they read */}
        {pod(podLx, podY, true, GREEN)}
        {pod(podRx, podY, true, GREEN)}
        <line x1={podLx} y1={podY - 40} x2={podLx} y2={podY - 78} stroke={GREEN} strokeWidth="3" markerEnd="url(#odoGreen)" />
        <line x1={podRx} y1={podY - 40} x2={podRx} y2={podY - 78} stroke={GREEN} strokeWidth="3" markerEnd="url(#odoGreen)" />
        <text x={podLx - 12} y={podY + 4} fill={GREEN} fontFamily={MONO} fontSize="13" textAnchor="end">dL</text>
        <text x={podRx + 12} y={podY + 4} fill={GREEN} fontFamily={MONO} fontSize="13">dR</text>

        {/* track width dimension */}
        <line x1={podLx} y1={cy + 52} x2={podRx} y2={cy + 52} stroke={AMBER} strokeWidth="2" markerEnd="url(#odoAmber)" markerStart="url(#odoAmber)" />
        <text x={cx} y={cy + 70} fill={AMBER} fontFamily={MONO} fontSize="13" textAnchor="middle">track width T</text>

        {/* the strafe pod */}
        {pod(cx, cy + hl - 26, false, ROSE)}
        <line x1={cx + 40} y1={cy + hl - 26} x2={cx + 82} y2={cy + hl - 26} stroke={ROSE} strokeWidth="3" markerEnd="url(#odoRose)" />
        <text x={cx + 6} y={cy + hl - 44} fill={ROSE} fontFamily={MONO} fontSize="13">strafe pod</text>

        {/* side legend: what the three readings become */}
        <g fontFamily={MONO}>
          <text x={Lx} y={92} fill={INK} fontSize="16">what the pods report</text>
          <line x1={Lx} y1={122} x2={Lx + 26} y2={122} stroke={GREEN} strokeWidth="5" strokeLinecap="round" />
          <text x={Lx + 36} y={127} fill={INK} fontSize="15">dL, dR — forward roll</text>
          <text x={Lx + 36} y={150} fill={MUTED} fontSize="14">ds = (dL + dR) / 2</text>
          <text x={Lx + 36} y={172} fill={MUTED} fontSize="14">dθ = (dR − dL) / T</text>
          <line x1={Lx} y1={210} x2={Lx + 26} y2={210} stroke={ROSE} strokeWidth="5" strokeLinecap="round" />
          <text x={Lx + 36} y={215} fill={INK} fontSize="15">strafe pod — sideways</text>
          <text x={Lx + 36} y={238} fill={MUTED} fontSize="14">d⊥ = lateral slide</text>
          <text x={Lx} y={286} fill={MUTED} fontSize="14">unpowered + sprung ⇒ they read</text>
          <text x={Lx} y={306} fill={MUTED} fontSize="14">the ground, not the motor</text>
        </g>
      </svg>
    </Figure>
  );
}
