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

type Pt = {x: number; y: number};
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

// Fixed sample abscissae (strictly increasing, as the LUT requires).
const XS = [0, 1, 2, 3, 4, 5, 6];
// Default Y: a rising-then-FLAT-then-rising shape. The three equal middle
// values are exactly the case that makes a natural spline misbehave.
const DEFAULT_YS = [10, 35, 72, 72, 72, 88, 96];

/* ---- Natural cubic spline (the one that overshoots) ----
   Solves for second derivatives M with natural end conditions M₀ = Mₙ₋₁ = 0
   via the Thomas algorithm, then evaluates the standard cubic piece. */
function naturalCubic(xs: number[], ys: number[]) {
  const n = xs.length;
  const h = (i: number) => xs[i + 1] - xs[i];
  const M = new Array(n).fill(0);
  if (n >= 3) {
    const lower = new Array(n).fill(0);
    const diag = new Array(n).fill(1);
    const upper = new Array(n).fill(0);
    const rhs = new Array(n).fill(0);
    for (let i = 1; i < n - 1; i++) {
      lower[i] = h(i - 1);
      diag[i] = 2 * (h(i - 1) + h(i));
      upper[i] = h(i);
      rhs[i] = 6 * ((ys[i + 1] - ys[i]) / h(i) - (ys[i] - ys[i - 1]) / h(i - 1));
    }
    // forward sweep
    for (let i = 2; i < n - 1; i++) {
      const w = lower[i] / diag[i - 1];
      diag[i] -= w * upper[i - 1];
      rhs[i] -= w * rhs[i - 1];
    }
    // back substitution (interior rows; M₀ and Mₙ₋₁ stay 0)
    for (let i = n - 2; i >= 1; i--) {
      M[i] = (rhs[i] - upper[i] * M[i + 1]) / diag[i];
    }
  }
  return (x: number) => {
    let i = 0;
    while (i < n - 2 && x > xs[i + 1]) i++;
    const hi = h(i);
    const A = (xs[i + 1] - x) / hi;
    const B = (x - xs[i]) / hi;
    return A * ys[i] + B * ys[i + 1] + ((A * A * A - A) * M[i] + (B * B * B - B) * M[i + 1]) * (hi * hi) / 6;
  };
}

/* ---- Monotone cubic Hermite, Fritsch–Carlson (the one that behaves) ----
   Mirrors InterpLUT.createLUT(): secant slopes → averaged tangents → clamp
   each tangent pair into the radius-3 monotonicity circle (Eq. 11). Returns
   the evaluator plus per-knot tangents and a flag for which were projected,
   so the UI can SHOW the algorithm acting. */
function monotoneHermite(xs: number[], ys: number[]) {
  const n = xs.length;
  const delta: number[] = []; // Eq. 9: secant slopes
  for (let i = 0; i < n - 1; i++) delta.push((ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]));

  // Eq. 10: interior tangents = average of neighbouring secants; ends one-sided
  const m = new Array(n).fill(0);
  m[0] = delta[0];
  m[n - 1] = delta[n - 2];
  for (let i = 1; i < n - 1; i++) m[i] = 0.5 * (delta[i - 1] + delta[i]);

  const flag: ('ok' | 'flat' | 'projected')[] = new Array(n).fill('ok');

  // Step 3: enforce monotonicity interval by interval
  for (let i = 0; i < n - 1; i++) {
    if (delta[i] === 0) {
      // flat segment → both tangents forced to zero (no overshoot possible)
      m[i] = 0;
      m[i + 1] = 0;
      flag[i] = flag[i] === 'projected' ? 'projected' : 'flat';
      flag[i + 1] = 'flat';
      continue;
    }
    const a = m[i] / delta[i];
    const b = m[i + 1] / delta[i];
    if (a * a + b * b > 9) {
      // outside the radius-3 circle → project back onto its boundary
      const tau = 3 / Math.sqrt(a * a + b * b);
      m[i] = tau * a * delta[i];
      m[i + 1] = tau * b * delta[i];
      if (flag[i] !== 'flat') flag[i] = 'projected';
      if (flag[i + 1] !== 'flat') flag[i + 1] = 'projected';
    }
  }

  const evaluate = (x: number) => {
    let i = 0;
    while (i < n - 2 && x > xs[i + 1]) i++;
    const hk = xs[i + 1] - xs[i];
    const t = (x - xs[i]) / hk;
    // Eq. 12: four Hermite basis functions
    const h00 = (1 + 2 * t) * (1 - t) * (1 - t);
    const h10 = t * (1 - t) * (1 - t);
    const h01 = t * t * (3 - 2 * t);
    const h11 = t * t * (t - 1);
    return h00 * ys[i] + h10 * hk * m[i] + h01 * ys[i + 1] + h11 * hk * m[i + 1];
  };
  return {evaluate, m, flag};
}

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
