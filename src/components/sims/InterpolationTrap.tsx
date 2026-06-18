/* MODULE 2 — "The Interpolation Trap"
   ------------------------------------------------------------------
   A robot reads calibration lookup tables (distance → flywheel speed) and
   interpolates BETWEEN the measured points at runtime. A natural cubic
   spline produces non-physical "humps" (overshoot) across a flat shelf of
   data — which would command an unintended speed change mid-range. The
   firmware's InterpLUT uses monotone cubic Hermite (Fritsch–Carlson) so the
   curve stays flat where the data is flat (Stoicescu §7.2, Eqs. 9–12).

   Drag any knot up/down. Watch the red natural spline overshoot while the
   blue monotone curve refuses to. Pure React + SVG (SSR-safe). */

import {useRef, useState} from 'react';
import {Demo, Readout, Legend, Buttons, Button} from '@site/src/components/kit/Demo';
import {clamp, monotoneHermite, naturalCubic, type Pt} from '@site/src/lib/projectile';

// Fixed sample abscissae (strictly increasing, as the LUT requires).
const XS = [0, 1, 2, 3, 4, 5, 6];
// Default Y: a rising-then-FLAT-then-rising shape. The three equal middle
// values are exactly the case that makes a natural spline misbehave.
const DEFAULT_YS = [10, 35, 72, 72, 72, 88, 96];

export default function InterpolationTrap() {
  const svgRef = useRef<SVGSVGElement>(null);
  const drag = useRef<number | null>(null);
  const [ys, setYs] = useState<number[]>([...DEFAULT_YS]);

  // ---- data → SVG mapping ----
  const W = 640;
  const H = 380;
  const padL = 40;
  const padR = 18;
  const padT = 22;
  const padB = 26;
  const X_MAX = 6;
  const Y_MAX = 110; // a little headroom so overshoot is visible
  const sx = (x: number) => padL + (x / X_MAX) * (W - padL - padR);
  const sy = (y: number) => padT + (1 - y / Y_MAX) * (H - padT - padB);
  const toY = (py: number) => clamp(((1 - (py - padT) / (H - padT - padB)) * Y_MAX), 0, Y_MAX);

  const nat = naturalCubic(XS, ys);
  const mono = monotoneHermite(XS, ys);

  // sample both curves densely
  const SAMPLES = 240;
  const natPts: Pt[] = [];
  const monoPts: Pt[] = [];
  let natMax = -Infinity;
  let natMin = Infinity;
  for (let i = 0; i <= SAMPLES; i++) {
    const x = (X_MAX * i) / SAMPLES;
    const yn = nat(x);
    const ym = mono.evaluate(x);
    natPts.push({x, y: yn});
    monoPts.push({x, y: ym});
    natMax = Math.max(natMax, yn);
    natMin = Math.min(natMin, yn);
  }
  // overshoot = how far each curve escapes the data's own value range
  const dataMax = Math.max(...ys);
  const dataMin = Math.min(...ys);
  const natOver = Math.max(0, natMax - dataMax, dataMin - natMin);

  const toPath = (pts: Pt[]) => 'M ' + pts.map((p) => `${sx(p.x).toFixed(1)} ${sy(clamp(p.y, -20, Y_MAX + 20)).toFixed(1)}`).join(' L ');

  // pointer handling — vertical drag of a knot only (x stays fixed)
  const onMove = (e: React.PointerEvent) => {
    if (drag.current == null) return;
    const r = svgRef.current!.getBoundingClientRect();
    const py = ((e.clientY - r.top) * H) / r.height;
    const i = drag.current;
    setYs((prev) => prev.map((v, j) => (j === i ? toY(py) : v)));
  };

  // tangent ticks: draw the monotone tangent at each knot (data-space slope)
  const tick = (i: number) => {
    const dx = 0.4;
    const x0 = XS[i] - dx;
    const x1 = XS[i] + dx;
    return {x1: sx(x0), y1: sy(ys[i] - mono.m[i] * dx), x2: sx(x1), y2: sy(ys[i] + mono.m[i] * dx)};
  };
  const tickColor = (f: string) => (f === 'flat' ? '#5ce08a' : f === 'projected' ? '#ff6f9c' : '#8294b8');

  return (
    <Demo title="The Interpolation Trap — monotone Hermite vs. natural spline">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="block h-auto w-full touch-none rounded-xl bg-[#0b1120]"
        role="img"
        aria-label="Line chart with draggable calibration points and two interpolating curves."
        onPointerMove={onMove}
        onPointerUp={() => (drag.current = null)}
        onPointerLeave={() => (drag.current = null)}>
        {/* frame */}
        <line x1={sx(0)} y1={sy(0)} x2={sx(X_MAX)} y2={sy(0)} stroke="#3b4a6b" strokeWidth="1.5" />
        <line x1={sx(0)} y1={sy(0)} x2={sx(0)} y2={sy(Y_MAX)} stroke="#3b4a6b" strokeWidth="1.5" />
        <text x={sx(0) - 6} y={sy(dataMax) + 4} textAnchor="end" fontFamily="JetBrains Mono, monospace" fontSize="10" fill="#6b7a9c">
          {dataMax.toFixed(0)}
        </text>
        <text x={W / 2} y={16} textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="11" fill="#6b7a9c">
          distance → commanded flywheel speed (drag the dots)
        </text>

        {/* shade the band the data actually spans; any curve leaving it is overshoot */}
        <rect x={sx(0)} y={sy(dataMax)} width={sx(X_MAX) - sx(0)} height={sy(dataMin) - sy(dataMax)} fill="rgba(111,139,255,0.05)" />

        {/* curves */}
        <path d={toPath(natPts)} fill="none" stroke="#ff6f9c" strokeWidth="2.5" strokeDasharray="7 5" />
        <path d={toPath(monoPts)} fill="none" stroke="#6f8bff" strokeWidth="3.5" strokeLinecap="round" />

        {/* monotone tangents at each knot (shows Fritsch–Carlson projection) */}
        {XS.map((_, i) => {
          const t = tick(i);
          return <line key={`t${i}`} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} stroke={tickColor(mono.flag[i])} strokeWidth="2" opacity="0.9" />;
        })}

        {/* knots */}
        {XS.map((x, i) => (
          <circle
            key={i}
            cx={sx(x)}
            cy={sy(ys[i])}
            r="8"
            fill="#e8eefc"
            stroke="#0b1120"
            strokeWidth="2"
            style={{cursor: 'ns-resize'}}
            onPointerDown={(e) => {
              drag.current = i;
              (e.target as Element).setPointerCapture(e.pointerId);
            }}
          />
        ))}
      </svg>

      <Buttons>
        <Button onClick={() => setYs([...DEFAULT_YS])}>↺ Reset (flat shelf)</Button>
        <Button onClick={() => setYs(XS.map((_, i) => 12 + i * 14))}>Make it a clean ramp</Button>
        <Button onClick={() => setYs([20, 70, 70, 70, 70, 70, 20])}>Flat plateau</Button>
      </Buttons>

      <Readout
        items={[
          ['Natural spline overshoot', `${natOver.toFixed(1)} units`],
          ['Monotone Hermite overshoot', '0.0 units (guaranteed)'],
          ['Tangents zeroed (flat)', String(mono.flag.filter((f) => f === 'flat').length)],
          ['Tangents projected (FC)', String(mono.flag.filter((f) => f === 'projected').length)],
        ]}
      />
      <Legend
        items={[
          {color: '#6f8bff', label: 'monotone Hermite (InterpLUT)'},
          {color: '#ff6f9c', label: 'natural cubic spline (overshoots)'},
          {color: '#5ce08a', label: 'tangent forced to 0 (flat data)'},
          {color: '#ff6f9c', label: 'tangent projected to radius-3 circle'},
        ]}
      />
    </Demo>
  );
}
