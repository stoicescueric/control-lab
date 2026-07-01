import type {ReactNode} from 'react';

/* Static teaching figures for the Advanced Research module. These are diagrams,
   not simulations: no state, no interaction. The interactive version of the
   lookup-table idea lives in the DynamicTargetingDashboard; this figure exists
   to make the concept legible on its own, in the same MathFigure frame the rest
   of the curriculum uses. */

function MathFigure({title, caption, children}: {title: string; caption: string; children: ReactNode}) {
  return (
    <figure className="not-prose my-7 overflow-hidden rounded-xl border border-line bg-surface shadow-card">
      <div className="bg-panel px-4 py-4 text-panel-ink">
        <div className="overflow-x-auto">
          <div className="min-w-[520px]">{children}</div>
        </div>
      </div>
      <figcaption className="border-t border-line bg-surface-2 px-4 py-3 text-sm leading-relaxed text-ink-soft">
        <strong className="text-ink">{title}</strong> - {caption}
      </figcaption>
    </figure>
  );
}

/* An interpolated lookup table reads a value between measured rows. The danger
   it illustrates: across a flat shelf of equal calibration points, a natural
   spline humps above values that were never measured, while a monotone
   interpolant stays inside the data. */
export function LookupTableIllustration() {
  // plot box in SVG coordinates
  const L = 96;
  const R = 612;
  const T = 54;
  const B = 286;

  // data domain: distance (in) -> commanded flywheel speed (ticks/s)
  const dMin = 20;
  const dMax = 120;
  const sMin = 1500;
  const sMax = 2850;
  const sx = (d: number) => L + ((d - dMin) / (dMax - dMin)) * (R - L);
  const sy = (s: number) => B - ((s - sMin) / (sMax - sMin)) * (B - T);

  // measured calibration shots: rises, then a flat shelf, then rises again
  const knots: [number, number][] = [
    [20, 1600],
    [40, 2050],
    [60, 2300],
    [80, 2300],
    [100, 2300],
    [120, 2750],
  ];
  const shelfS = 2300;
  const queryD = 70; // a distance that falls inside the flat shelf

  return (
    <MathFigure
      title="Reading between the rows of a calibration table"
      caption="A lookup table stores flywheel speed at a few measured distances; interpolation fills the gaps. Across a flat shelf, a natural spline (rose) bulges to speeds that were never measured, while a monotone interpolant (blue) stays inside the data — which is why the deployed table uses the monotone one.">
      <svg viewBox="0 0 760 360" role="img" aria-label="Calibration lookup table: measured points, an overshooting natural spline, and a safe monotone interpolant." className="h-auto w-full">
        <rect width="760" height="360" rx="16" fill="#0b1120" />

        {/* gridlines at the measured distances */}
        {knots.map(([d]) => (
          <line key={`g${d}`} x1={sx(d)} y1={T} x2={sx(d)} y2={B} stroke="rgba(255,255,255,0.05)" />
        ))}
        {[1600, 2000, 2400, 2800].map((s) => (
          <g key={`gy${s}`}>
            <line x1={L} y1={sy(s)} x2={R} y2={sy(s)} stroke="rgba(255,255,255,0.05)" />
            <text x={L - 8} y={sy(s) + 4} textAnchor="end" fill="#8294b8" fontFamily="JetBrains Mono, monospace" fontSize="11">
              {s}
            </text>
          </g>
        ))}

        {/* axes */}
        <line x1={L} y1={B} x2={R} y2={B} stroke="#31405f" strokeWidth="2" />
        <line x1={L} y1={T} x2={L} y2={B} stroke="#31405f" strokeWidth="2" />
        <text x={(L + R) / 2} y={332} textAnchor="middle" fill="#8294b8" fontFamily="JetBrains Mono, monospace" fontSize="13">
          distance to target (in)
        </text>
        <text x={26} y={(T + B) / 2} textAnchor="middle" fill="#8294b8" fontFamily="JetBrains Mono, monospace" fontSize="13" transform={`rotate(-90 26 ${(T + B) / 2})`}>
          flywheel speed (ticks/s)
        </text>
        {knots.map(([d]) => (
          <text key={`xl${d}`} x={sx(d)} y={B + 18} textAnchor="middle" fill="#6b7a9c" fontFamily="JetBrains Mono, monospace" fontSize="10">
            {d}
          </text>
        ))}

        {/* the band of values the flat shelf actually measured; anything the
            curve draws above it is speed that was never measured */}
        <rect x={sx(60)} y={sy(2480)} width={sx(100) - sx(60)} height={sy(shelfS) - sy(2480)} fill="rgba(255,111,156,0.12)" />
        <text x={sx(80)} y={sy(2520)} textAnchor="middle" fill="#ff9ab7" fontFamily="JetBrains Mono, monospace" fontSize="11">
          speed never measured
        </text>

        {/* natural cubic spline: humps above the flat shelf (rose, dashed) */}
        <path
          d={`M ${sx(20)} ${sy(1600)}
              C ${sx(30)} ${sy(1780)}, ${sx(34)} ${sy(2010)}, ${sx(40)} ${sy(2050)}
              C ${sx(50)} ${sy(2120)}, ${sx(55)} ${sy(2280)}, ${sx(60)} ${sy(2300)}
              C ${sx(70)} ${sy(2330)}, ${sx(90)} ${sy(2470)}, ${sx(100)} ${sy(2300)}
              C ${sx(108)} ${sy(2180)}, ${sx(114)} ${sy(2560)}, ${sx(120)} ${sy(2750)}`}
          fill="none"
          stroke="#ff6f9c"
          strokeWidth="2.5"
          strokeDasharray="7 5"
        />

        {/* monotone interpolant: flat where the data is flat (blue, solid) */}
        <path
          d={`M ${sx(20)} ${sy(1600)}
              C ${sx(30)} ${sy(1820)}, ${sx(34)} ${sy(2010)}, ${sx(40)} ${sy(2050)}
              C ${sx(50)} ${sy(2150)}, ${sx(55)} ${sy(2290)}, ${sx(60)} ${sy(2300)}
              L ${sx(100)} ${sy(2300)}
              C ${sx(108)} ${sy(2300)}, ${sx(114)} ${sy(2540)}, ${sx(120)} ${sy(2750)}`}
          fill="none"
          stroke="#6f8bff"
          strokeWidth="4"
          strokeLinecap="round"
        />

        {/* query: read the table at a distance that lands on the flat shelf */}
        <line x1={sx(queryD)} y1={B} x2={sx(queryD)} y2={sy(shelfS)} stroke="#ffc24d" strokeWidth="1.5" strokeDasharray="3 4" />
        <line x1={L} y1={sy(shelfS)} x2={sx(queryD)} y2={sy(shelfS)} stroke="#ffc24d" strokeWidth="1.5" strokeDasharray="3 4" />
        <circle cx={sx(queryD)} cy={sy(shelfS)} r="5.5" fill="#ffc24d" />
        <text x={sx(queryD) + 8} y={B - 8} fill="#ffc24d" fontFamily="JetBrains Mono, monospace" fontSize="11">
          query d*
        </text>
        <text x={L + 8} y={sy(shelfS) - 8} fill="#ffc24d" fontFamily="JetBrains Mono, monospace" fontSize="11">
          interpolated command
        </text>

        {/* measured calibration shots */}
        {knots.map(([d, s], i) => (
          <circle key={`k${i}`} cx={sx(d)} cy={sy(s)} r="6" fill="#e8eefc" stroke="#0b1120" strokeWidth="2" />
        ))}
        <text x={sx(40)} y={sy(2050) - 12} textAnchor="middle" fill="#aab8d6" fontFamily="JetBrains Mono, monospace" fontSize="11">
          measured shots
        </text>
        <text x={sx(80)} y={sy(shelfS) + 22} textAnchor="middle" fill="#7f8eb0" fontFamily="JetBrains Mono, monospace" fontSize="11">
          flat shelf: 3 equal points
        </text>

        {/* inline legend */}
        <g fontFamily="JetBrains Mono, monospace" fontSize="12">
          <line x1={648} y1={64} x2={676} y2={64} stroke="#6f8bff" strokeWidth="4" />
          <text x={682} y={68} fill="#b9c5de">monotone</text>
          <line x1={648} y1={86} x2={676} y2={86} stroke="#ff6f9c" strokeWidth="2.5" strokeDasharray="7 5" />
          <text x={682} y={90} fill="#b9c5de">natural</text>
        </g>
      </svg>
    </MathFigure>
  );
}

export default LookupTableIllustration;
