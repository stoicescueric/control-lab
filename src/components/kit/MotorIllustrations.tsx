import type {ReactNode} from 'react';

/* Static figures for the "How a Motor Works" lesson: an exploded view of a
   brushed DC motor with every part labelled, and a brushed-vs-brushless
   cross-section. Same dark treatment as the other kit illustrations. */

const INK = '#e8eefc';
const MUTED = '#8294b8';
const GRID = '#31405f';
const BLUE = '#6f8bff';
const GREEN = '#5ce08a';
const AMBER = '#ffc24d';
const ROSE = '#ff6f9c';
const COPPER = '#e0a36a';
const IRON = '#5b6680';
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

function Label({x, y, lx, ly, text, color = MUTED, anchor = 'middle'}: {x: number; y: number; lx: number; ly: number; text: string; color?: string; anchor?: string}) {
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

/** Exploded view of a brushed DC motor along its shaft axis. */
export function MotorExploded() {
  const cy = 215;
  // copper winding hatch on the armature
  const winding = Array.from({length: 9}, (_, i) => 290 + i * 13);
  return (
    <Figure
      title="Inside a brushed DC motor"
      caption="The parts laid out along the shaft. Current enters through the brushes, crosses the commutator into the spinning armature windings, and the magnets' field turns that current into a twisting force on the shaft.">
      <svg viewBox="0 0 760 420" role="img" aria-label="Exploded view of a brushed DC motor with labelled components" className="h-auto w-full">
        <rect width="760" height="420" rx="16" fill="#0b1120" />

        {/* shaft through-line */}
        <line x1="70" y1={cy} x2="710" y2={cy} stroke={GRID} strokeWidth="2" strokeDasharray="3 6" />

        {/* output shaft (right) */}
        <rect x="610" y={cy - 7} width="100" height="14" rx="4" fill={IRON} stroke="#74809c" strokeWidth="1.5" />
        <Label x={680} y={cy} lx={680} ly={cy + 60} text="output shaft" color={INK} />

        {/* front bearing / endcap */}
        <circle cx={600} cy={cy} r="20" fill="#16203a" stroke="#2a3656" strokeWidth="2" />
        <circle cx={600} cy={cy} r="8" fill="#0b1120" stroke="#74809c" strokeWidth="1.5" />
        <Label x={600} y={cy - 20} lx={600} ly={cy - 70} text="bearing + endcap" />

        {/* steel housing (the can) */}
        <rect x="430" y={cy - 78} width="150" height="156" rx="16" fill="none" stroke="#3b4a6b" strokeWidth="2.5" strokeDasharray="2 5" />
        <Label x={505} y={cy + 78} lx={505} ly={cy + 100} text="steel housing (can)" />

        {/* permanent magnets — stator (N on top, S on bottom) */}
        <path d={`M 450 ${cy - 60} Q 505 ${cy - 90} 560 ${cy - 60} L 560 ${cy - 40} Q 505 ${cy - 66} 450 ${cy - 40} Z`} fill={ROSE} opacity="0.85" />
        <text x={505} y={cy - 52} textAnchor="middle" fontFamily={MONO} fontSize="15" fontWeight="700" fill="#3a0d1c">N</text>
        <path d={`M 450 ${cy + 60} Q 505 ${cy + 90} 560 ${cy + 60} L 560 ${cy + 40} Q 505 ${cy + 66} 450 ${cy + 40} Z`} fill={BLUE} opacity="0.85" />
        <text x={505} y={cy + 56} textAnchor="middle" fontFamily={MONO} fontSize="15" fontWeight="700" fill="#0a1335">S</text>
        <Label x={560} y={cy - 50} lx={648} ly={cy - 96} text="magnets (stator)" color={INK} anchor="middle" />

        {/* armature / rotor: iron core + windings on the shaft */}
        <rect x="280" y={cy - 46} width="130" height="92" rx="12" fill={IRON} stroke="#7a87a6" strokeWidth="2" />
        {winding.map((x) => (
          <line key={x} x1={x} y1={cy - 44} x2={x - 16} y2={cy + 44} stroke={COPPER} strokeWidth="2.5" opacity="0.9" />
        ))}
        <Label x={345} y={cy + 46} lx={325} ly={cy + 120} text="armature (rotor)" color={INK} />

        {/* commutator: segmented copper ring */}
        <rect x="232" y={cy - 26} width="34" height="52" rx="4" fill={COPPER} stroke="#b87a45" strokeWidth="1.5" />
        <line x1="249" y1={cy - 26} x2="249" y2={cy + 26} stroke="#8a5a30" strokeWidth="1.5" />
        <line x1="240" y1={cy - 26} x2="240" y2={cy + 26} stroke="#8a5a30" strokeWidth="1" />
        <line x1="258" y1={cy - 26} x2="258" y2={cy + 26} stroke="#8a5a30" strokeWidth="1" />
        <Label x={249} y={cy - 26} lx={249} ly={cy - 70} text="commutator" color={COPPER} />

        {/* brushes pressing on the commutator, with springs */}
        <rect x="238" y={cy - 58} width="22" height="20" rx="3" fill={AMBER} />
        <rect x="238" y={cy + 38} width="22" height="20" rx="3" fill={AMBER} />
        <polyline points={`249,${cy - 58} 244,${cy - 64} 254,${cy - 70} 244,${cy - 76} 249,${cy - 82}`} fill="none" stroke={MUTED} strokeWidth="1.3" />
        <polyline points={`249,${cy + 58} 244,${cy + 64} 254,${cy + 70} 244,${cy + 76} 249,${cy + 82}`} fill="none" stroke={MUTED} strokeWidth="1.3" />
        <Label x={249} y={cy + 58} lx={132} ly={cy + 82} text="brushes (carbon)" color={AMBER} />

        {/* rear bearing / power leads */}
        <circle cx={110} cy={cy} r="16" fill="#16203a" stroke="#2a3656" strokeWidth="2" />
        <line x1="78" y1={cy - 8} x2="110" y2={cy - 8} stroke={ROSE} strokeWidth="2.5" />
        <line x1="78" y1={cy + 8} x2="110" y2={cy + 8} stroke={BLUE} strokeWidth="2.5" />
        <Label x={94} y={cy} lx={110} ly={cy - 60} text="power leads (+ / −)" color={INK} />
      </svg>
    </Figure>
  );
}

/** Brushed vs brushless cross-sections. */
export function BrushedVsBrushless() {
  const cy = 175;
  const coil = (cx: number, cyy: number, r: number, color: string) =>
    Array.from({length: 8}, (_, i) => {
      const a = (i / 8) * Math.PI * 2;
      return <rect key={i} x={cx + Math.cos(a) * r - 7} y={cyy + Math.sin(a) * r - 7} width="14" height="14" rx="3" fill={color} opacity="0.85" transform={`rotate(${(a * 180) / Math.PI} ${cx + Math.cos(a) * r} ${cyy + Math.sin(a) * r})`} />;
    });
  return (
    <Figure
      title="Brushed vs. brushless"
      caption="Both turn current into torque with magnets and coils — they differ only in how the current is switched to the right coil at the right moment: mechanically (brushes scraping a commutator) or electronically (a controller).">
      <svg viewBox="0 0 760 360" role="img" aria-label="Cross-sections of a brushed and a brushless DC motor" className="h-auto w-full">
        <rect width="760" height="360" rx="16" fill="#0b1120" />

        {/* ---- BRUSHED (left): magnets outside, wound rotor inside ---- */}
        <text x={190} y={36} textAnchor="middle" fontFamily={MONO} fontSize="15" fontWeight="700" fill={INK}>Brushed</text>
        <circle cx={190} cy={cy} r="118" fill="none" stroke="#3b4a6b" strokeWidth="2" />
        {/* stator magnets */}
        <path d={`M ${190 - 110} ${cy} A 110 110 0 0 1 ${190 + 110} ${cy}`} fill="none" stroke={ROSE} strokeWidth="14" opacity="0.8" />
        <path d={`M ${190 - 110} ${cy} A 110 110 0 0 0 ${190 + 110} ${cy}`} fill="none" stroke={BLUE} strokeWidth="14" opacity="0.8" />
        <text x={190} y={cy - 90} textAnchor="middle" fontFamily={MONO} fontSize="13" fill={ROSE}>magnet (N)</text>
        <text x={190} y={cy + 100} textAnchor="middle" fontFamily={MONO} fontSize="13" fill={BLUE}>magnet (S)</text>
        {/* wound rotor (coils spin) */}
        {coil(190, cy, 52, COPPER)}
        <circle cx={190} cy={cy} r="14" fill={IRON} stroke="#7a87a6" strokeWidth="1.5" />
        {/* commutator + brushes at center */}
        <rect x={176} y={cy + 118} width="28" height="16" rx="3" fill={AMBER} />
        <text x={190} y={cy + 150} textAnchor="middle" fontFamily={MONO} fontSize="12" fill={AMBER}>brushes + commutator</text>
        <text x={190} y={cy + 168} textAnchor="middle" fontFamily={MONO} fontSize="11" fill={MUTED}>windings spin · magnets fixed</text>

        {/* divider */}
        <line x1={380} y1="50" x2={380} y2="310" stroke={GRID} strokeWidth="1.5" strokeDasharray="3 6" />

        {/* ---- BRUSHLESS (right): windings outside, magnet rotor inside ---- */}
        <text x={565} y={36} textAnchor="middle" fontFamily={MONO} fontSize="15" fontWeight="700" fill={INK}>Brushless</text>
        <circle cx={565} cy={cy} r="118" fill="none" stroke="#3b4a6b" strokeWidth="2" />
        {/* stator windings (fixed coils on the outside) */}
        {coil(565, cy, 96, GREEN)}
        <text x={565} y={cy - 92} textAnchor="middle" fontFamily={MONO} fontSize="13" fill={GREEN}>windings (stator, fixed)</text>
        {/* permanent-magnet rotor inside */}
        <circle cx={565} cy={cy} r="46" fill="none" stroke="#2a3656" strokeWidth="2" />
        <path d={`M ${565 - 44} ${cy} A 44 44 0 0 1 ${565 + 44} ${cy} L ${565} ${cy} Z`} fill={ROSE} opacity="0.55" />
        <path d={`M ${565 - 44} ${cy} A 44 44 0 0 0 ${565 + 44} ${cy} L ${565} ${cy} Z`} fill={BLUE} opacity="0.55" />
        <text x={565} y={cy + 4} textAnchor="middle" fontFamily={MONO} fontSize="11" fill={INK}>magnet rotor</text>
        {/* electronic controller box */}
        <rect x={510} y={cy + 120} width="110" height="22" rx="5" fill="#16203a" stroke={GREEN} strokeWidth="1.5" />
        <text x={565} y={cy + 135} textAnchor="middle" fontFamily={MONO} fontSize="11" fill={GREEN}>controller (ESC)</text>
        <text x={565} y={cy + 166} textAnchor="middle" fontFamily={MONO} fontSize="11" fill={MUTED}>magnets spin · no brushes to wear</text>
      </svg>
    </Figure>
  );
}
