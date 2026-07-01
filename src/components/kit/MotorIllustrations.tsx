import type {ReactNode} from 'react';

/* Static figures for the "How a Motor Works" lesson: an exploded view of a
   brushed DC motor with every part labelled and the current path traced, and a
   brushed-vs-brushless cross-section with wound poles, phase coils, and
   rotation arrows. Same dark treatment as the other kit illustrations. */

const INK = '#e8eefc';
const MUTED = '#8294b8';
const GRID = '#31405f';
const BLUE = '#6f8bff';
const GREEN = '#5ce08a';
const AMBER = '#ffc24d';
const ROSE = '#ff6f9c';
const COPPER = '#e0a36a';
const COPPER_DK = '#8a5a30';
const MONO = 'JetBrains Mono, monospace';

function Figure({title, caption, children}: {title: string; caption: string; children: ReactNode}) {
  return (
    <figure className="not-prose my-7 overflow-hidden rounded-xl border border-line bg-surface shadow-card">
      <div className="bg-panel px-4 py-5 text-panel-ink">
        <div className="overflow-x-auto">
          <div className="min-w-[520px]">{children}</div>
        </div>
      </div>
      <figcaption className="border-t border-line bg-surface-2 px-4 py-3 text-[0.95rem] leading-relaxed text-ink-soft">
        <strong className="text-ink">{title}</strong> — {caption}
      </figcaption>
    </figure>
  );
}

function Label({
  x,
  y,
  lx,
  ly,
  text,
  color = MUTED,
  anchor = 'middle',
}: {
  x: number;
  y: number;
  lx: number;
  ly: number;
  text: string;
  color?: string;
  anchor?: 'start' | 'middle' | 'end' | 'inherit';
}) {
  return (
    <>
      <line x1={x} y1={y} x2={lx} y2={ly} stroke={color} strokeWidth="1" opacity="0.7" />
      <circle cx={x} cy={y} r="2.5" fill={color} />
      <text x={lx} y={ly} textAnchor={anchor} fontFamily={MONO} fontSize="13" fill={color}>
        {text}
      </text>
    </>
  );
}

/** Shared metal / copper gradients for the pseudo-3D cylinders. */
function MotorDefs() {
  return (
    <defs>
      <linearGradient id="mIron" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#7a87a6" />
        <stop offset="0.5" stopColor="#4a5570" />
        <stop offset="1" stopColor="#333c52" />
      </linearGradient>
      <linearGradient id="mSteel" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#9aa6c0" />
        <stop offset="0.5" stopColor="#5b6680" />
        <stop offset="1" stopColor="#3d465e" />
      </linearGradient>
      <linearGradient id="mCopper" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#f0bd85" />
        <stop offset="0.5" stopColor="#cf8f52" />
        <stop offset="1" stopColor="#9c6534" />
      </linearGradient>
      <marker id="mAmber" markerUnits="userSpaceOnUse" markerWidth="12" markerHeight="12" refX="9" refY="6" orient="auto" viewBox="0 0 12 12">
        <path d="M0 1 L11 6 L0 11 Z" fill={AMBER} />
      </marker>
      <marker id="mGreen" markerUnits="userSpaceOnUse" markerWidth="12" markerHeight="12" refX="9" refY="6" orient="auto" viewBox="0 0 12 12">
        <path d="M0 1 L11 6 L0 11 Z" fill={GREEN} />
      </marker>
    </defs>
  );
}

/** A horizontal cylinder: shaded body + right end cap; optionally an open left mouth. */
function Cyl({
  x,
  w,
  r,
  cy,
  fill,
  stroke,
  openLeft = false,
}: {
  x: number;
  w: number;
  r: number;
  cy: number;
  fill: string;
  stroke: string;
  openLeft?: boolean;
}) {
  const rx = Math.max(6, r * 0.22);
  return (
    <g>
      <rect x={x} y={cy - r} width={w} height={2 * r} fill={fill} stroke="none" />
      <ellipse cx={x + w} cy={cy} rx={rx} ry={r} fill={fill} stroke={stroke} strokeWidth="1.5" />
      {openLeft ? (
        <ellipse cx={x} cy={cy} rx={rx} ry={r} fill="#0b1120" stroke={stroke} strokeWidth="1.5" />
      ) : (
        <ellipse cx={x} cy={cy} rx={rx} ry={r} fill={fill} stroke={stroke} strokeWidth="1.5" />
      )}
      <line x1={x} y1={cy - r} x2={x + w} y2={cy - r} stroke={stroke} strokeWidth="1.5" />
      <line x1={x} y1={cy + r} x2={x + w} y2={cy + r} stroke={stroke} strokeWidth="1.5" />
    </g>
  );
}

/** Exploded view of a brushed DC motor along its shaft axis. */
export function MotorExploded() {
  const cy = 210;
  return (
    <Figure
      title="Inside a brushed DC motor"
      caption="The parts pulled apart along the shaft, with the current path in amber: in through a lead, through a spring-loaded carbon brush, across the spinning commutator into the armature windings — where the magnets' field turns it into torque — and back out the other brush. In the assembled motor the armature spins inside the magnet can.">
      <svg viewBox="0 0 760 430" role="img" aria-label="Exploded view of a brushed DC motor with labelled components and the current path" className="h-auto w-full">
        <rect width="760" height="430" rx="16" fill="#0b1120" />
        <MotorDefs />

        {/* shaft centerline through everything */}
        <line x1="60" y1={cy} x2="722" y2={cy} stroke={GRID} strokeWidth="1.5" strokeDasharray="3 7" />

        {/* the shaft itself, visible in the gaps between parts */}
        <Cyl x={252} w={462} r={7} cy={cy} fill="url(#mSteel)" stroke="#74809c" />
        <Label x={700} y={cy - 7} lx={686} ly={cy - 52} text="output shaft" color={INK} />

        {/* rear endcap with the power leads */}
        <Cyl x={86} w={26} r={56} cy={cy} fill="url(#mIron)" stroke="#5b6680" />
        <line x1="34" y1={cy - 14} x2="86" y2={cy - 14} stroke={ROSE} strokeWidth="3.5" strokeLinecap="round" />
        <line x1="34" y1={cy + 14} x2="86" y2={cy + 14} stroke={BLUE} strokeWidth="3.5" strokeLinecap="round" />
        <text x={30} y={cy - 10} textAnchor="end" fontFamily={MONO} fontSize="13" fill={ROSE}>+</text>
        <text x={30} y={cy + 19} textAnchor="end" fontFamily={MONO} fontSize="13" fill={BLUE}>−</text>
        <Label x={99} y={cy + 56} lx={99} ly={cy + 106} text="rear endcap + leads" />

        {/* brushes: carbon blocks on springs, pressing toward the commutator */}
        {[-1, 1].map((s) => (
          <g key={s}>
            <path
              d={`M 168 ${cy + s * 88} l 5 ${-s * 7} l -10 ${-s * 7} l 10 ${-s * 7} l -5 ${-s * 7}`}
              fill="none"
              stroke={MUTED}
              strokeWidth="1.5"
            />
            <rect x={158} y={s === -1 ? cy - 60 : cy + 36} width="20" height="24" rx="3" fill="#3a4152" stroke={AMBER} strokeWidth="1.5" />
          </g>
        ))}
        <Label x={168} y={cy - 60} lx={168} ly={cy - 122} text="brushes (carbon, sprung)" color={AMBER} />

        {/* commutator: segmented copper cylinder */}
        <Cyl x={196} w={42} r={30} cy={cy} fill="url(#mCopper)" stroke={COPPER_DK} />
        {[-0.55, 0, 0.55].map((f) => (
          <line key={f} x1={196} y1={cy + f * 30} x2={238} y2={cy + f * 30} stroke={COPPER_DK} strokeWidth="1.5" />
        ))}
        <Label x={217} y={cy + 30} lx={217} ly={cy + 92} text="commutator (segments)" color={COPPER} />

        {/* armature: iron core wound in copper */}
        <Cyl x={282} w={132} r={52} cy={cy} fill="url(#mIron)" stroke="#7a87a6" />
        {Array.from({length: 8}, (_, i) => 292 + i * 14).map((x) => (
          <line key={x} x1={x + 12} y1={cy - 50} x2={x - 4} y2={cy + 50} stroke={COPPER} strokeWidth="3" opacity="0.9" />
        ))}
        <Label x={348} y={cy - 52} lx={348} ly={cy - 116} text="armature (rotor): iron + windings" color={INK} />

        {/* magnet can: open cylinder showing N / S arc magnets inside */}
        <Cyl x={470} w={140} r={84} cy={cy} fill="#182138" stroke="#3b4a6b" openLeft />
        {/* interior magnets seen through the open mouth */}
        <path d={`M 452 ${cy - 66} A 20 66 0 0 1 488 ${cy - 66} A 20 42 0 0 0 470 ${cy - 44} A 20 42 0 0 0 452 ${cy - 66} Z`} fill={ROSE} opacity="0.9" />
        <path d={`M 452 ${cy + 66} A 20 66 0 0 0 488 ${cy + 66} A 20 42 0 0 1 470 ${cy + 44} A 20 42 0 0 1 452 ${cy + 66} Z`} fill={BLUE} opacity="0.9" />
        <text x={470} y={cy - 50} textAnchor="middle" fontFamily={MONO} fontSize="14" fontWeight="700" fill="#3a0d1c">N</text>
        <text x={470} y={cy + 60} textAnchor="middle" fontFamily={MONO} fontSize="14" fontWeight="700" fill="#0a1335">S</text>
        <Label x={540} y={cy - 84} lx={540} ly={cy - 122} text="magnets in the steel can (stator)" color={INK} />

        {/* field arrow through the can: N -> S */}
        <line x1={540} y1={cy - 40} x2={540} y2={cy + 34} stroke={GREEN} strokeWidth="2.5" strokeDasharray="6 5" markerEnd="url(#mGreen)" opacity="0.9" />
        <text x={552} y={cy + 2} fontFamily={MONO} fontSize="12" fill={GREEN}>field B</text>

        {/* front endcap + bearing */}
        <Cyl x={640} w={22} r={44} cy={cy} fill="url(#mIron)" stroke="#5b6680" />
        <ellipse cx={662} cy={cy} rx={7} ry={13} fill="#0b1120" stroke="#74809c" strokeWidth="1.5" />
        <Label x={651} y={cy + 44} lx={651} ly={cy + 96} text="front endcap + bearing" />

        {/* current path: + lead -> top brush -> commutator -> winding -> bottom brush -> − lead */}
        <path
          d={`M 40 ${cy - 14} L 86 ${cy - 14} L 168 ${cy - 48} L 217 ${cy - 30}
              L 300 ${cy - 46} L 286 ${cy + 46} L 217 ${cy + 30} L 168 ${cy + 48} L 86 ${cy + 14} L 46 ${cy + 14}`}
          fill="none"
          stroke={AMBER}
          strokeWidth="2"
          strokeDasharray="5 5"
          opacity="0.85"
          markerEnd="url(#mAmber)"
        />
        <text x={64} y={cy - 30} fontFamily={MONO} fontSize="12" fill={AMBER}>current</text>
      </svg>
    </Figure>
  );
}

/* ------------------------- cross-section helpers ------------------------- */

const rad = (deg: number) => (deg * Math.PI) / 180;
const pol = (cx: number, cy: number, r: number, deg: number): [number, number] => [
  cx + r * Math.cos(rad(deg)),
  cy + r * Math.sin(rad(deg)),
];

/** Annular sector path between radii r0 < r1 from angle a0 to a1 (screen degrees). */
function ringSector(cx: number, cy: number, r0: number, r1: number, a0: number, a1: number): string {
  const large = a1 - a0 > 180 ? 1 : 0;
  const [x1, y1] = pol(cx, cy, r1, a0);
  const [x2, y2] = pol(cx, cy, r1, a1);
  const [x3, y3] = pol(cx, cy, r0, a1);
  const [x4, y4] = pol(cx, cy, r0, a0);
  return `M ${x1.toFixed(1)} ${y1.toFixed(1)} A ${r1} ${r1} 0 ${large} 1 ${x2.toFixed(1)} ${y2.toFixed(1)} L ${x3.toFixed(1)} ${y3.toFixed(1)} A ${r0} ${r0} 0 ${large} 0 ${x4.toFixed(1)} ${y4.toFixed(1)} Z`;
}

function arcPath(cx: number, cy: number, r: number, a0: number, a1: number): string {
  const large = a1 - a0 > 180 ? 1 : 0;
  const [x1, y1] = pol(cx, cy, r, a0);
  const [x2, y2] = pol(cx, cy, r, a1);
  return `M ${x1.toFixed(1)} ${y1.toFixed(1)} A ${r} ${r} 0 ${large} 1 ${x2.toFixed(1)} ${y2.toFixed(1)}`;
}

/** Brushed vs brushless cross-sections. */
export function BrushedVsBrushless() {
  const cy = 190;
  const L = 190; // brushed center x
  const R = 565; // brushless center x

  const PHASE: [string, string][] = [
    ['A', GREEN],
    ['B', AMBER],
    ['C', BLUE],
  ];

  return (
    <Figure
      title="Brushed vs. brushless"
      caption="Both turn current into torque with magnets and coils — they differ in what spins and how the current is switched to the right coil at the right moment. Brushed: the wound rotor spins inside fixed magnets, switched mechanically by brushes scraping the commutator. Brushless: a magnet rotor spins inside fixed windings, switched electronically by the controller energizing the three phases in sequence.">
      <svg viewBox="0 0 760 400" role="img" aria-label="Cross-sections of a brushed and a brushless DC motor" className="h-auto w-full">
        <rect width="760" height="400" rx="16" fill="#0b1120" />
        <MotorDefs />

        {/* ------------------- BRUSHED (left) ------------------- */}
        <text x={L} y={38} textAnchor="middle" fontFamily={MONO} fontSize="15" fontWeight="700" fill={INK}>Brushed</text>

        {/* can */}
        <circle cx={L} cy={cy} r={122} fill="#101a2e" stroke="#3b4a6b" strokeWidth="2.5" />
        {/* stator magnets: two arc segments */}
        <path d={ringSector(L, cy, 100, 118, -160, -20)} fill={ROSE} opacity="0.85" />
        <path d={ringSector(L, cy, 100, 118, 20, 160)} fill={BLUE} opacity="0.85" />
        <text x={L} y={cy - 103} textAnchor="middle" fontFamily={MONO} fontSize="13" fontWeight="700" fill="#3a0d1c">N</text>
        <text x={L} y={cy + 112} textAnchor="middle" fontFamily={MONO} fontSize="13" fontWeight="700" fill="#0a1335">S</text>

        {/* wound rotor: three iron poles, each with a copper coil */}
        {[-90, 30, 150].map((a) => {
          const [tx, ty] = pol(L, cy, 78, a);
          return (
            <g key={a}>
              {/* pole arm */}
              <line x1={L} y1={cy} x2={tx} y2={ty} stroke="#5b6680" strokeWidth="16" strokeLinecap="round" />
              {/* pole shoe */}
              <path d={ringSector(L, cy, 72, 88, a - 24, a + 24)} fill="#4a5570" stroke="#7a87a6" strokeWidth="1" />
              {/* coil wound around the arm */}
              {[34, 46, 58].map((rr) => {
                const [px1, py1] = pol(L, cy, rr, a - 13);
                const [px2, py2] = pol(L, cy, rr, a + 13);
                return <line key={rr} x1={px1} y1={py1} x2={px2} y2={py2} stroke={COPPER} strokeWidth="5" strokeLinecap="round" />;
              })}
            </g>
          );
        })}

        {/* commutator + brushes at the center */}
        <circle cx={L} cy={cy} r={17} fill="url(#mCopper)" stroke={COPPER_DK} strokeWidth="1.5" />
        {[-90, 30, 150].map((a) => {
          const [x1, y1] = pol(L, cy, 6, a + 60);
          const [x2, y2] = pol(L, cy, 17, a + 60);
          return <line key={a} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#0b1120" strokeWidth="2" />;
        })}
        <rect x={L - 38} y={cy - 6} width="16" height="12" rx="2" fill="#3a4152" stroke={AMBER} strokeWidth="1.5" />
        <rect x={L + 22} y={cy - 6} width="16" height="12" rx="2" fill="#3a4152" stroke={AMBER} strokeWidth="1.5" />

        {/* rotation arrow */}
        <path d={arcPath(L, cy, 138, -60, 20)} fill="none" stroke={GREEN} strokeWidth="2.5" markerEnd="url(#mGreen)" />
        <text x={L + 92} y={62} textAnchor="middle" fontFamily={MONO} fontSize="12" fill={GREEN}>rotor spins</text>

        <text x={L} y={cy + 152} textAnchor="middle" fontFamily={MONO} fontSize="12" fill={AMBER}>switched mechanically:</text>
        <text x={L} y={cy + 170} textAnchor="middle" fontFamily={MONO} fontSize="12" fill={AMBER}>brushes scrape the commutator</text>
        <text x={L} y={cy + 192} textAnchor="middle" fontFamily={MONO} fontSize="11" fill={MUTED}>windings spin · magnets fixed</text>

        {/* divider */}
        <line x1={378} y1="54" x2={378} y2="386" stroke={GRID} strokeWidth="1.5" strokeDasharray="3 6" />

        {/* ------------------- BRUSHLESS (right) ------------------- */}
        <text x={R} y={38} textAnchor="middle" fontFamily={MONO} fontSize="15" fontWeight="700" fill={INK}>Brushless</text>

        {/* can */}
        <circle cx={R} cy={cy} r={122} fill="#101a2e" stroke="#3b4a6b" strokeWidth="2.5" />
        {/* stator: nine wound teeth, phases A/B/C repeating */}
        {Array.from({length: 9}, (_, i) => {
          const a = -90 + i * 40;
          const [name, color] = PHASE[i % 3];
          const [lx, ly] = pol(R, cy, 66, a);
          return (
            <g key={i}>
              <path d={ringSector(R, cy, 76, 116, a - 14, a + 14)} fill="#4a5570" stroke="#7a87a6" strokeWidth="1" />
              {[84, 94, 104].map((rr) => {
                const [px1, py1] = pol(R, cy, rr, a - 11);
                const [px2, py2] = pol(R, cy, rr, a + 11);
                return <line key={rr} x1={px1} y1={py1} x2={px2} y2={py2} stroke={color} strokeWidth="4" strokeLinecap="round" opacity="0.85" />;
              })}
              <text x={lx} y={ly + 4} textAnchor="middle" fontFamily={MONO} fontSize="10" fill={color}>{name}</text>
            </g>
          );
        })}

        {/* permanent-magnet rotor: four alternating poles */}
        {[0, 90, 180, 270].map((a, i) => (
          <path key={a} d={ringSector(R, cy, 26, 50, a - 45, a + 45)} fill={i % 2 ? BLUE : ROSE} opacity="0.85" />
        ))}
        <circle cx={R} cy={cy} r={26} fill="url(#mIron)" stroke="#7a87a6" strokeWidth="1.5" />
        <circle cx={R} cy={cy} r={7} fill="#0b1120" stroke="#9aa6c0" strokeWidth="1.5" />

        {/* rotation arrow */}
        <path d={arcPath(R, cy, 138, -60, 20)} fill="none" stroke={GREEN} strokeWidth="2.5" markerEnd="url(#mGreen)" />
        <text x={R + 92} y={62} textAnchor="middle" fontFamily={MONO} fontSize="12" fill={GREEN}>rotor spins</text>

        {/* ESC with three phase wires */}
        <rect x={R - 62} y={cy + 140} width="124" height="26" rx="6" fill="#16203a" stroke={GREEN} strokeWidth="1.5" />
        <text x={R} y={cy + 157} textAnchor="middle" fontFamily={MONO} fontSize="12" fill={GREEN}>controller (ESC)</text>
        {PHASE.map(([, color], i) => {
          const [tx, ty] = pol(R, cy, 120, 64 + i * 26);
          return <path key={i} d={`M ${R - 30 + i * 30} ${cy + 140} C ${R - 30 + i * 30} ${cy + 118}, ${tx} ${ty + 16}, ${tx} ${ty}`} fill="none" stroke={color} strokeWidth="2.5" opacity="0.9" />;
        })}
        <text x={R} y={cy + 192} textAnchor="middle" fontFamily={MONO} fontSize="11" fill={MUTED}>magnets spin · no brushes to wear</text>
      </svg>
    </Figure>
  );
}
