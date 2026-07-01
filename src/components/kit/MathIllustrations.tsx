import type {ReactNode} from 'react';

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

export function CalculusIllustration() {
  return (
    <MathFigure
      title="Derivative and integral on one motion curve"
      caption="The tangent is velocity at one instant; the shaded area is accumulated distance over time.">
      <svg viewBox="0 0 760 330" role="img" aria-label="Position curve with tangent line and shaded area" className="h-auto w-full">
        <defs>
          <linearGradient id="calcArea" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#4f6cf7" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#4f6cf7" stopOpacity="0.04" />
          </linearGradient>
          <marker id="calcArrow" markerHeight="8" markerWidth="8" orient="auto" refX="7" refY="4" viewBox="0 0 8 8">
            <path d="M0 0 L8 4 L0 8 Z" fill="#ffc24d" />
          </marker>
        </defs>
        <rect width="760" height="330" rx="16" fill="#0b1120" />
        <line x1="74" x2="710" y1="262" y2="262" stroke="#31405f" strokeWidth="2" />
        <line x1="74" x2="74" y1="44" y2="262" stroke="#31405f" strokeWidth="2" />
        <text x="700" y="292" fill="#8294b8" fontFamily="JetBrains Mono, monospace" fontSize="13">time</text>
        <text x="24" y="56" fill="#8294b8" fontFamily="JetBrains Mono, monospace" fontSize="13">position</text>
        <path d="M98 242 C170 230 204 204 254 176 C330 132 390 104 466 126 C548 150 602 205 682 218 L682 262 L98 262 Z" fill="url(#calcArea)" />
        <path d="M98 242 C170 230 204 204 254 176 C330 132 390 104 466 126 C548 150 602 205 682 218" fill="none" stroke="#5ce08a" strokeWidth="4" strokeLinecap="round" />
        <circle cx="354" cy="122" r="7" fill="#fff" />
        <line x1="258" x2="470" y1="174" y2="80" stroke="#ffc24d" strokeWidth="4" strokeLinecap="round" markerEnd="url(#calcArrow)" />
        <text x="468" y="76" fill="#ffc24d" fontFamily="JetBrains Mono, monospace" fontSize="14">slope = velocity</text>
        <text x="350" y="245" fill="#93a7ff" fontFamily="JetBrains Mono, monospace" fontSize="14" textAnchor="middle">area under velocity = distance</text>
      </svg>
    </MathFigure>
  );
}

export function LinearAlgebraIllustration() {
  return (
    <MathFigure
      title="A matrix rotates the driver's field vector"
      caption="Field-centric drive is a coordinate-frame transform before wheel mixing.">
      <svg viewBox="0 0 760 330" role="img" aria-label="Field vector rotated into robot frame" className="h-auto w-full">
        <defs>
          <marker id="laBlue" markerHeight="8" markerWidth="8" orient="auto" refX="7" refY="4" viewBox="0 0 8 8">
            <path d="M0 0 L8 4 L0 8 Z" fill="#6f8bff" />
          </marker>
          <marker id="laAmber" markerHeight="8" markerWidth="8" orient="auto" refX="7" refY="4" viewBox="0 0 8 8">
            <path d="M0 0 L8 4 L0 8 Z" fill="#ffc24d" />
          </marker>
        </defs>
        <rect width="760" height="330" rx="16" fill="#0b1120" />
        <g transform="translate(185 172)">
          <circle r="108" fill="#101a2e" stroke="#2a3656" strokeWidth="2" />
          <line x1="-120" x2="120" y1="0" y2="0" stroke="#31405f" />
          <line x1="0" x2="0" y1="-120" y2="120" stroke="#31405f" />
          <line x1="0" x2="55" y1="0" y2="-92" stroke="#6f8bff" strokeWidth="5" markerEnd="url(#laBlue)" />
          <text x="58" y="-104" fill="#93a7ff" fontFamily="JetBrains Mono, monospace" fontSize="13">field command</text>
          <text x="-44" y="136" fill="#8294b8" fontFamily="JetBrains Mono, monospace" fontSize="13">field frame</text>
        </g>
        <g transform="translate(540 172) rotate(-35)">
          <circle r="108" fill="#101a2e" stroke="#2a3656" strokeWidth="2" />
          <line x1="-120" x2="120" y1="0" y2="0" stroke="#31405f" />
          <line x1="0" x2="0" y1="-120" y2="120" stroke="#31405f" />
          <rect x="-50" y="-34" width="100" height="68" rx="12" fill="#16203a" stroke="#6f8bff" strokeWidth="2" />
          <path d="M-24 -20 L34 0 L-24 20 Z" fill="#6f8bff" opacity="0.8" />
          <line x1="0" x2="94" y1="0" y2="-8" stroke="#ffc24d" strokeWidth="5" markerEnd="url(#laAmber)" />
          <text x="56" y="-28" fill="#ffc24d" fontFamily="JetBrains Mono, monospace" fontSize="13" transform="rotate(35 56 -28)">robot-frame command</text>
        </g>
        <text x="380" y="72" fill="#e8eefc" fontFamily="JetBrains Mono, monospace" fontSize="18" textAnchor="middle">R(-theta) * field vector = robot vector</text>
      </svg>
    </MathFigure>
  );
}

export function DifferentialEquationsIllustration() {
  const arrows = [
    [118, 94, 34, -14], [198, 86, 28, -4], [280, 90, 20, 8], [360, 104, 10, 16], [440, 128, -2, 20], [520, 158, -14, 18], [600, 194, -24, 8],
    [122, 180, 30, -22], [206, 174, 22, -10], [290, 180, 12, 4], [374, 194, 2, 14], [458, 216, -10, 16], [542, 238, -22, 10], [626, 252, -28, 0],
  ];
  return (
    <MathFigure
      title="A differential equation gives local arrows"
      caption="Each arrow says how the state changes next; the curve follows those local instructions.">
      <svg viewBox="0 0 760 330" role="img" aria-label="Slope field with trajectory" className="h-auto w-full">
        <defs>
          <marker id="deArrow" markerHeight="7" markerWidth="7" orient="auto" refX="6" refY="3.5" viewBox="0 0 7 7">
            <path d="M0 0 L7 3.5 L0 7 Z" fill="#8294b8" />
          </marker>
          <marker id="deCurveArrow" markerHeight="8" markerWidth="8" orient="auto" refX="7" refY="4" viewBox="0 0 8 8">
            <path d="M0 0 L8 4 L0 8 Z" fill="#5ce08a" />
          </marker>
        </defs>
        <rect width="760" height="330" rx="16" fill="#0b1120" />
        <line x1="82" x2="690" y1="264" y2="264" stroke="#31405f" strokeWidth="2" />
        <line x1="82" x2="82" y1="52" y2="264" stroke="#31405f" strokeWidth="2" />
        {arrows.map(([x, y, dx, dy], i) => (
          <line key={i} x1={x} x2={x + dx} y1={y} y2={y + dy} stroke="#8294b8" strokeWidth="2.5" strokeLinecap="round" markerEnd="url(#deArrow)" opacity="0.78" />
        ))}
        <path d="M104 238 C190 192 265 176 344 182 C444 190 512 146 640 86" fill="none" stroke="#5ce08a" strokeWidth="5" strokeLinecap="round" markerEnd="url(#deCurveArrow)" />
        <circle cx="104" cy="238" r="7" fill="#ffc24d" />
        <text x="124" y="256" fill="#ffc24d" fontFamily="JetBrains Mono, monospace" fontSize="13">current state</text>
        <text x="444" y="70" fill="#e8eefc" fontFamily="JetBrains Mono, monospace" fontSize="16">dx/dt = f(x, u)</text>
      </svg>
    </MathFigure>
  );
}

export function StateSpaceIllustration() {
  return (
    <MathFigure
      title="Prediction and correction in a state estimator"
      caption="The model predicts the next state; sensors correct the estimate before the next loop.">
      <svg viewBox="0 0 760 350" role="img" aria-label="State-space prediction and correction loop" className="h-auto w-full">
        <defs>
          <marker id="ssArrow" markerHeight="8" markerWidth="8" orient="auto" refX="7" refY="4" viewBox="0 0 8 8">
            <path d="M0 0 L8 4 L0 8 Z" fill="#93a7ff" />
          </marker>
        </defs>
        <rect width="760" height="350" rx="16" fill="#0b1120" />
        <g fontFamily="JetBrains Mono, monospace" fontSize="14">
          <rect x="70" y="98" width="150" height="86" rx="14" fill="#16203a" stroke="#6f8bff" strokeWidth="2" />
          <text x="145" y="130" fill="#e8eefc" textAnchor="middle">state x_k</text>
          <text x="145" y="157" fill="#8294b8" textAnchor="middle">pose, velocity</text>
          <rect x="305" y="98" width="170" height="86" rx="14" fill="#16203a" stroke="#5ce08a" strokeWidth="2" />
          <text x="390" y="130" fill="#e8eefc" textAnchor="middle">model</text>
          <text x="390" y="157" fill="#8294b8" textAnchor="middle">A x + B u</text>
          <rect x="560" y="98" width="150" height="86" rx="14" fill="#16203a" stroke="#ffc24d" strokeWidth="2" />
          <text x="635" y="130" fill="#e8eefc" textAnchor="middle">predicted</text>
          <text x="635" y="157" fill="#8294b8" textAnchor="middle">{'x_{k+1}'}</text>
          <rect x="305" y="236" width="170" height="72" rx="14" fill="#16203a" stroke="#ff6f9c" strokeWidth="2" />
          <text x="390" y="264" fill="#e8eefc" textAnchor="middle">sensor y_k</text>
          <text x="390" y="290" fill="#8294b8" textAnchor="middle">encoder, IMU, tag</text>
        </g>
        <line x1="220" x2="304" y1="141" y2="141" stroke="#93a7ff" strokeWidth="3" markerEnd="url(#ssArrow)" />
        <line x1="475" x2="558" y1="141" y2="141" stroke="#93a7ff" strokeWidth="3" markerEnd="url(#ssArrow)" />
        <path d="M635 184 C636 236 548 272 477 272" fill="none" stroke="#93a7ff" strokeWidth="3" markerEnd="url(#ssArrow)" />
        <path d="M304 272 C210 274 145 238 145 186" fill="none" stroke="#93a7ff" strokeWidth="3" markerEnd="url(#ssArrow)" />
        <text x="385" y="58" fill="#e8eefc" fontFamily="JetBrains Mono, monospace" fontSize="17" textAnchor="middle">predict -&gt; measure -&gt; correct -&gt; repeat</text>
      </svg>
    </MathFigure>
  );
}
