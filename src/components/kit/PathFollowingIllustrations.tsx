import type {ReactNode} from 'react';

/* Static figures for the Path Following module. Same dark treatment as the
   odometry figures; imported directly by the lessons that use them. */

const MUTED = '#8294b8';
const GRID = '#31405f';
const GREEN = '#5ce08a';
const ROSE = '#ff6f9c';
const AMBER = '#ffc24d';
const BLUE = '#6f8bff';
const INK = '#e8eefc';
const MONO = 'JetBrains Mono, monospace';

/** Fixed-size arrowheads shared by the figures (independent of stroke width). */
function PfArrowDefs() {
  const heads: [string, string][] = [
    ['pfBlue', BLUE],
    ['pfGreen', GREEN],
    ['pfAmber', AMBER],
    ['pfRose', ROSE],
    ['pfGray', MUTED],
  ];
  return (
    <defs>
      {heads.map(([id, fill]) => (
        <marker key={id} id={id} markerUnits="userSpaceOnUse" markerWidth="14" markerHeight="14" refX="11" refY="7" orient="auto" viewBox="0 0 14 14">
          <path d="M0 1 L13 7 L0 13 Z" fill={fill} />
        </marker>
      ))}
    </defs>
  );
}

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

/** Heading-dial point: math angle (CCW positive), y up. */
function dial(cx: number, cy: number, r: number, deg: number): [number, number] {
  return [cx + r * Math.cos(rad(deg)), cy - r * Math.sin(rad(deg))];
}

function sampleArc(cx: number, cy: number, r: number, a0: number, a1: number, n: number): string {
  return Array.from({length: n}, (_, i) => dial(cx, cy, r, a0 + (i / (n - 1)) * (a1 - a0)))
    .map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`)
    .join(' ');
}

export function BrakingProfileIllustration() {
  // plot speed (y) vs distance-to-target (x). target at left (d = 0).
  const x0 = 90;
  const x1 = 660;
  const y0 = 285; // speed 0
  const yTop = 60;
  const dMax = 6; // metres shown
  const a = 1.6; // decel m/s^2
  const vMax = 2.2; // m/s cap
  const px = (d: number) => x0 + (d / dMax) * (x1 - x0);
  const py = (v: number) => y0 - (v / 3.0) * (y0 - yTop);

  const sqrtCurve = Array.from({length: 80}, (_, i) => {
    const d = (i / 79) * dMax;
    return [px(d), py(Math.sqrt(2 * a * d))] as [number, number];
  });
  const profile = Array.from({length: 80}, (_, i) => {
    const d = (i / 79) * dMax;
    return [px(d), py(Math.min(vMax, Math.sqrt(2 * a * d)))] as [number, number];
  });
  const toPath = (pts: [number, number][]) => pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');

  return (
    <Figure
      title="Cap the command by the distance left to stop"
      caption="The braking limit v = √(2·a·d) (green) is the fastest you can go and still stop at the target. Commanding the speed cap (amber) gives a clean trapezoid; a pure-proportional command (rose) is too fast far out, so the robot overshoots.">
      <svg viewBox="0 0 720 320" role="img" aria-label="Speed versus distance braking profile" className="h-auto w-full">
        <rect width="720" height="320" rx="16" fill="#0b1120" />
        {/* axes */}
        <line x1={x0} y1={y0} x2={x1} y2={y0} stroke={GRID} strokeWidth="2" />
        <line x1={x0} y1={y0} x2={x0} y2={yTop - 6} stroke={GRID} strokeWidth="2" />
        <text x={x1} y={y0 + 24} fill={MUTED} fontFamily={MONO} fontSize="14" textAnchor="end">distance to target →  (target at left)</text>
        <text x={x0 - 8} y={yTop} fill={MUTED} fontFamily={MONO} fontSize="14" textAnchor="end">speed</text>

        {/* vMax line */}
        <line x1={x0} y1={py(vMax)} x2={x1} y2={py(vMax)} stroke={MUTED} strokeWidth="1.5" strokeDasharray="6 6" />
        <text x={x1 - 6} y={py(vMax) - 8} fill={MUTED} fontFamily={MONO} fontSize="13" textAnchor="end">v_max</text>

        {/* braking limit */}
        <path d={toPath(sqrtCurve)} fill="none" stroke={GREEN} strokeWidth="3" strokeDasharray="2 6" opacity="0.7" />
        {/* chosen profile = min(vMax, sqrt) */}
        <path d={toPath(profile)} fill="none" stroke={AMBER} strokeWidth="5" strokeLinecap="round" />
        {/* pure proportional (too aggressive far out) */}
        <line x1={px(0)} y1={py(0)} x2={px(dMax)} y2={py(3.4)} stroke={ROSE} strokeWidth="3" strokeDasharray="9 7" />

        {/* legend, lower-right where no curve passes */}
        <g fontFamily={MONO} fontSize="14">
          <line x1={446} y1={206} x2={472} y2={206} stroke={GREEN} strokeWidth="3" strokeDasharray="2 6" />
          <text x={480} y={211} fill={GREEN}>v = √(2·a·d) limit</text>
          <line x1={446} y1={234} x2={472} y2={234} stroke={AMBER} strokeWidth="5" />
          <text x={480} y={239} fill={AMBER}>commanded profile</text>
          <line x1={446} y1={262} x2={472} y2={262} stroke={ROSE} strokeWidth="3" strokeDasharray="9 7" />
          <text x={480} y={267} fill={ROSE}>pure kP·d (overshoots)</text>
        </g>
      </svg>
    </Figure>
  );
}

export function AngleWrapIllustration() {
  const cx = 230;
  const cy = 175;
  const r = 120;
  const A = 179; // current heading
  const B = -179; // target heading

  const pA = dial(cx, cy, r, A);
  const pB = dial(cx, cy, r, B);

  return (
    <Figure
      title="The ±180° seam: short way vs. long way"
      caption="Current heading 179° and target −179° are 2° apart across the seam (green). Subtracting them naively gives −358°, sending the controller the long way around (red). Wrapping the error into [−π, π] fixes it.">
      <svg viewBox="0 0 720 350" role="img" aria-label="Heading circle showing the angle-wrap seam" className="h-auto w-full">
        <rect width="720" height="350" rx="16" fill="#0b1120" />
        <defs>
          <marker id="awGreen" markerUnits="userSpaceOnUse" markerWidth="14" markerHeight="14" refX="11" refY="7" orient="auto" viewBox="0 0 14 14">
            <path d="M0 1 L13 7 L0 13 Z" fill={GREEN} />
          </marker>
          <marker id="awRose" markerUnits="userSpaceOnUse" markerWidth="14" markerHeight="14" refX="11" refY="7" orient="auto" viewBox="0 0 14 14">
            <path d="M0 1 L13 7 L0 13 Z" fill={ROSE} />
          </marker>
        </defs>

        {/* dial */}
        <circle cx={cx} cy={cy} r={r} fill="#101a2e" stroke={GRID} strokeWidth="2" />
        {[0, 90, 180, -90].map((d) => {
          const o = dial(cx, cy, r, d);
          const inn = dial(cx, cy, r - 12, d);
          const lab = dial(cx, cy, r + 22, d);
          return (
            <g key={d}>
              <line x1={inn[0]} y1={inn[1]} x2={o[0]} y2={o[1]} stroke={MUTED} strokeWidth="2" />
              <text x={lab[0]} y={lab[1] + 4} fill={MUTED} fontFamily={MONO} fontSize="13" textAnchor="middle">
                {d === 180 ? '±180°' : `${d}°`}
              </text>
            </g>
          );
        })}

        {/* seam marker */}
        <line x1={dial(cx, cy, r - 14, 180)[0]} y1={dial(cx, cy, r - 14, 180)[1]} x2={dial(cx, cy, r + 10, 180)[0]} y2={dial(cx, cy, r + 10, 180)[1]} stroke={AMBER} strokeWidth="2.5" strokeDasharray="4 4" />

        {/* long way (naive −358°): 179° down through 0 to −179° */}
        <path d={sampleArc(cx, cy, r + 0.0, A, B, 60)} fill="none" stroke={ROSE} strokeWidth="4" strokeLinecap="round" markerEnd="url(#awRose)" opacity="0.9" />

        {/* short way (+2° across the seam): 179° up to 181° (= −179°) */}
        <path d={sampleArc(cx, cy, r, A, 181, 10)} fill="none" stroke={GREEN} strokeWidth="6" strokeLinecap="round" markerEnd="url(#awGreen)" />

        {/* heading + target spokes */}
        <line x1={cx} y1={cy} x2={pA[0]} y2={pA[1]} stroke="#6f8bff" strokeWidth="2.5" />
        <circle cx={pA[0]} cy={pA[1]} r="6" fill="#6f8bff" />
        <circle cx={pB[0]} cy={pB[1]} r="6" fill={AMBER} />

        {/* legend, right side */}
        <g fontFamily={MONO} fontSize="15">
          <circle cx={470} cy={96} r="6" fill="#6f8bff" />
          <text x={486} y={101} fill="#e8eefc">current = 179°</text>
          <circle cx={470} cy={130} r="6" fill={AMBER} />
          <text x={486} y={135} fill="#e8eefc">target = −179°</text>
          <line x1={458} y1={176} x2={484} y2={176} stroke={GREEN} strokeWidth="6" strokeLinecap="round" />
          <text x={492} y={181} fill={GREEN}>wrapped error = +2°</text>
          <line x1={458} y1={212} x2={484} y2={212} stroke={ROSE} strokeWidth="4" strokeLinecap="round" />
          <text x={492} y={217} fill={ROSE}>naive error = −358°</text>
          <text x={458} y={262} fill={MUTED} fontSize="14">wrap with</text>
          <text x={458} y={286} fill="#e8eefc" fontSize="15">atan2(sin e, cos e)</text>
        </g>
      </svg>
    </Figure>
  );
}

/* ---------------------------------------------------------------------------
   PID-to-point: the field-frame error to the target, rotated into the robot
   frame so it splits into a forward command and a strafe command.
   --------------------------------------------------------------------------- */
export function PidToPointIllustration() {
  const O: [number, number] = [180, 250]; // robot
  const phi = 28; // robot heading (degrees, CCW math)
  const T: [number, number] = [560, 110]; // target
  // robot-frame axes in screen coords (y-up flipped to y-down)
  const fwd: [number, number] = [Math.cos(rad(phi)), -Math.sin(rad(phi))];
  const left: [number, number] = [Math.cos(rad(phi + 90)), -Math.sin(rad(phi + 90))];
  const d: [number, number] = [T[0] - O[0], T[1] - O[1]];
  const f = d[0] * fwd[0] + d[1] * fwd[1]; // forward component
  const l = d[0] * left[0] + d[1] * left[1]; // strafe component (signed)
  const foot: [number, number] = [O[0] + f * fwd[0], O[1] + f * fwd[1]];
  const hTip: [number, number] = [O[0] + 150 * fwd[0], O[1] + 150 * fwd[1]];

  return (
    <Figure
      title="PID-to-point: rotate the field error into the robot frame"
      caption="The blue vector is the field-frame error to the target. Projecting it onto the robot's own forward and left axes splits it into the forward command (amber) and strafe command (green) the mecanum mixer actually wants — plus a separate wrapped heading error.">
      <svg viewBox="0 0 720 330" role="img" aria-label="PID-to-point error decomposed into robot-frame forward and strafe" className="h-auto w-full">
        <rect width="720" height="330" rx="16" fill="#0b1120" />
        <PfArrowDefs />

        {/* robot forward axis (dashed guide) */}
        <line x1={O[0]} y1={O[1]} x2={hTip[0]} y2={hTip[1]} stroke={GRID} strokeWidth="2" strokeDasharray="7 7" />

        {/* forward + strafe legs (the rotated error) */}
        <line x1={O[0]} y1={O[1]} x2={foot[0]} y2={foot[1]} stroke={AMBER} strokeWidth="4" strokeLinecap="round" markerEnd="url(#pfAmber)" />
        <line x1={foot[0]} y1={foot[1]} x2={T[0]} y2={T[1]} stroke={GREEN} strokeWidth="4" strokeLinecap="round" markerEnd="url(#pfGreen)" />
        <text x={(O[0] + foot[0]) / 2 - 6} y={(O[1] + foot[1]) / 2 - 12} fill={AMBER} fontFamily={MONO} fontSize="15">eₓ (forward)</text>
        <text x={(foot[0] + T[0]) / 2 + 10} y={(foot[1] + T[1]) / 2} fill={GREEN} fontFamily={MONO} fontSize="15">e_y (strafe)</text>

        {/* field-frame error vector */}
        <line x1={O[0]} y1={O[1]} x2={T[0]} y2={T[1]} stroke={BLUE} strokeWidth="5" strokeLinecap="round" markerEnd="url(#pfBlue)" />
        <text x={O[0] + 116} y={O[1] - 6} fill={BLUE} fontFamily={MONO} fontSize="15">field error (eₓ, e_y)</text>

        {/* robot */}
        <g transform={`translate(${O[0]} ${O[1]}) rotate(${-phi})`}>
          <rect x="-26" y="-22" width="52" height="44" rx="9" fill="#16203a" stroke={BLUE} strokeWidth="2" />
          <path d="M26 -11 L42 0 L26 11 Z" fill={BLUE} />
        </g>
        <text x={O[0] - 18} y={O[1] + 38} fill={INK} fontFamily={MONO} fontSize="15" textAnchor="middle">robot</text>

        {/* target pose */}
        <circle cx={T[0]} cy={T[1]} r="8" fill={AMBER} />
        <text x={T[0] + 14} y={T[1] + 2} fill={AMBER} fontFamily={MONO} fontSize="15">target pose</text>

        {/* heading-error inset, bottom-right (clear area) */}
        <g transform="translate(606 250)">
          <line x1="0" y1="0" x2={42 * fwd[0]} y2={42 * fwd[1]} stroke={MUTED} strokeWidth="3" markerEnd="url(#pfGray)" />
          <line x1="0" y1="0" x2={42 * Math.cos(rad(-12))} y2={-42 * Math.sin(rad(-12))} stroke={AMBER} strokeWidth="3" markerEnd="url(#pfAmber)" />
          <path d={sampleArc(0, 0, 24, phi, -12, 16)} fill="none" stroke={ROSE} strokeWidth="2.5" />
          <text x="-2" y="-48" fill={ROSE} fontFamily={MONO} fontSize="14" textAnchor="middle">e_θ</text>
          <text x="-2" y="64" fill={MUTED} fontFamily={MONO} fontSize="12" textAnchor="middle">heading error</text>
        </g>
      </svg>
    </Figure>
  );
}

/* ---------------------------------------------------------------------------
   Quintic splines: curvature across a waypoint join. Cubic (C1) jumps; quintic
   (C2) is continuous. Path sketch on top, curvature plot below.
   --------------------------------------------------------------------------- */
export function SplineContinuityIllustration() {
  const x0 = 80;
  const x1 = 660;
  const joins = [1 / 3, 2 / 3];
  const px = (s: number) => x0 + s * (x1 - x0);

  // path sketch (top band): an S of two segments meeting at s = 1/2
  const pathPts = Array.from({length: 60}, (_, i) => {
    const s = i / 59;
    const y = 80 + 34 * Math.sin(2 * Math.PI * s);
    return [px(s), y] as [number, number];
  });

  // curvature band
  const cy0 = 200;
  const cyMid = 270;
  const kScale = 52;
  const ky = (k: number) => cyMid - k * kScale;
  const quintic = (s: number) => Math.sin(3 * Math.PI * s) * 0.85;
  const cubicOffset = (s: number) => (s < 1 / 3 ? 0 : s < 2 / 3 ? 0.5 : -0.35);
  const toPath = (pts: [number, number][]) => pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');

  const quinticPts = Array.from({length: 90}, (_, i) => {
    const s = i / 89;
    return [px(s), ky(quintic(s))] as [number, number];
  });
  // cubic: piecewise with jumps at the joins
  const cubicSegs = [[0, 1 / 3], [1 / 3, 2 / 3], [2 / 3, 1]].map(([a, b]) =>
    Array.from({length: 30}, (_, i) => {
      const s = a + (i / 29) * (b - a);
      return [px(s), ky(quintic(s) + cubicOffset(s))] as [number, number];
    }),
  );

  return (
    <Figure
      title="Why cubic paths jerk: curvature jumps at the join"
      caption="A C¹ cubic spline (rose) matches position and heading at each waypoint but lets curvature step discontinuously — the robot must change steering instantly. A C² quintic (green) also matches acceleration, so curvature is continuous and the steering is smooth.">
      <svg viewBox="0 0 720 340" role="img" aria-label="Curvature continuity of cubic versus quintic splines" className="h-auto w-full">
        <rect width="720" height="340" rx="16" fill="#0b1120" />

        {/* path sketch */}
        <path d={toPath(pathPts)} fill="none" stroke={BLUE} strokeWidth="3.5" strokeLinecap="round" />
        <text x={x0} y={36} fill={MUTED} fontFamily={MONO} fontSize="13">the path (waypoints ●)</text>
        {[0, ...joins, 1].map((s, i) => {
          const yy = 80 + 34 * Math.sin(2 * Math.PI * s);
          return <circle key={i} cx={px(s)} cy={yy} r="5" fill={AMBER} />;
        })}

        {/* curvature axes */}
        <line x1={x0} y1={cy0 - 18} x2={x0} y2={cy0 + 120} stroke={GRID} strokeWidth="2" />
        <line x1={x0} y1={cyMid} x2={x1} y2={cyMid} stroke={GRID} strokeWidth="1.5" strokeDasharray="4 6" />
        <text x={x0} y={cy0 - 24} fill={MUTED} fontFamily={MONO} fontSize="13">curvature κ</text>

        {/* waypoint join lines */}
        {joins.map((s, i) => (
          <line key={i} x1={px(s)} y1={cy0 - 14} x2={px(s)} y2={cy0 + 116} stroke={GRID} strokeWidth="1.5" strokeDasharray="3 7" />
        ))}

        {/* cubic (jumps) */}
        {cubicSegs.map((seg, i) => (
          <path key={i} d={toPath(seg)} fill="none" stroke={ROSE} strokeWidth="3.5" strokeLinecap="round" />
        ))}
        {/* the jump risers, dotted, at each join */}
        {joins.map((s, i) => (
          <line key={i} x1={px(s)} y1={ky(quintic(s) + (i === 0 ? 0 : 0.5))} x2={px(s)} y2={ky(quintic(s) + (i === 0 ? 0.5 : -0.35))} stroke={ROSE} strokeWidth="2" strokeDasharray="2 4" opacity="0.8" />
        ))}

        {/* quintic (continuous) */}
        <path d={toPath(quinticPts)} fill="none" stroke={GREEN} strokeWidth="4" strokeLinecap="round" />

        {/* legend */}
        <g fontFamily={MONO} fontSize="14">
          <line x1={300} y1={170} x2={326} y2={170} stroke={ROSE} strokeWidth="3.5" />
          <text x={334} y={175} fill={ROSE}>cubic — C¹ (κ jumps)</text>
          <line x1={520} y1={170} x2={546} y2={170} stroke={GREEN} strokeWidth="4" />
          <text x={554} y={175} fill={GREEN}>quintic — C²</text>
        </g>
      </svg>
    </Figure>
  );
}

/* ---------------------------------------------------------------------------
   Guided vector field: arrows everywhere point onto the path and along it.
   Drawn for a straight path so the field law is exact and legible.
   --------------------------------------------------------------------------- */
export function GuidedVectorFieldIllustration() {
  const yPath = 190; // horizontal path
  const t: [number, number] = [1, 0]; // tangent (screen)
  const n: [number, number] = [0, 1]; // normal (screen, downward)
  const k = 0.018; // converge gain
  const arrowLen = 24;

  const xs = [120, 200, 280, 360, 440, 520, 600];
  const ys = [70, 118, 166, 214, 262, 310];

  const arrows = xs.flatMap((x) =>
    ys.map((y) => {
      const e = y - yPath; // signed cross-track error
      let vx = t[0] - k * e * n[0];
      let vy = t[1] - k * e * n[1];
      const m = Math.hypot(vx, vy) || 1;
      vx /= m;
      vy /= m;
      return {x, y, x2: x + arrowLen * vx, y2: y + arrowLen * vy};
    }),
  );

  // a sample robot off the path
  const R: [number, number] = [200, 100];
  const eR = R[1] - yPath;
  let rvx = t[0] - k * eR * n[0];
  let rvy = t[1] - k * eR * n[1];
  const rm = Math.hypot(rvx, rvy);
  rvx /= rm;
  rvy /= rm;

  return (
    <Figure
      title="A guided vector field: flow along, converge onto"
      caption="Every point on the field gets a desired direction: the path tangent minus a pull toward the path that grows with the cross-track error. Far off the path the arrows point onto it; on the path they align with it. The robot just follows the arrow under it.">
      <svg viewBox="0 0 720 340" role="img" aria-label="Guided vector field arrows converging onto a path" className="h-auto w-full">
        <rect width="720" height="340" rx="16" fill="#0b1120" />
        <PfArrowDefs />

        {/* the path */}
        <line x1={80} y1={yPath} x2={660} y2={yPath} stroke={GREEN} strokeWidth="4" strokeLinecap="round" />
        <text x={664} y={yPath + 5} fill={GREEN} fontFamily={MONO} fontSize="14">path</text>

        {/* field arrows */}
        {arrows.map((a, i) => (
          <line key={i} x1={a.x} y1={a.y} x2={a.x2} y2={a.y2} stroke={MUTED} strokeWidth="2" markerEnd="url(#pfGray)" opacity="0.85" />
        ))}

        {/* sample robot: tangent (green), error normal (rose), desired (amber) */}
        <line x1={R[0]} y1={R[1]} x2={R[0] + 54} y2={R[1]} stroke={GREEN} strokeWidth="2.5" strokeDasharray="6 5" markerEnd="url(#pfGreen)" />
        <line x1={R[0]} y1={R[1]} x2={R[0]} y2={yPath} stroke={ROSE} strokeWidth="2.5" strokeDasharray="6 5" markerEnd="url(#pfRose)" />
        <line x1={R[0]} y1={R[1]} x2={R[0] + 64 * rvx} y2={R[1] + 64 * rvy} stroke={AMBER} strokeWidth="4" strokeLinecap="round" markerEnd="url(#pfAmber)" />
        <circle cx={R[0]} cy={R[1]} r="7" fill={BLUE} />
        <text x={R[0] - 12} y={R[1] - 10} fill={INK} fontFamily={MONO} fontSize="14" textAnchor="end">robot</text>
        <text x={R[0] + 58} y={R[1] - 8} fill={GREEN} fontFamily={MONO} fontSize="13">tangent t̂</text>
        <text x={R[0] - 10} y={(R[1] + yPath) / 2} fill={ROSE} fontFamily={MONO} fontSize="13" textAnchor="end">error e</text>
        <text x={R[0] + 64 * rvx + 10} y={R[1] + 64 * rvy + 14} fill={AMBER} fontFamily={MONO} fontSize="13">v_des</text>
      </svg>
    </Figure>
  );
}
