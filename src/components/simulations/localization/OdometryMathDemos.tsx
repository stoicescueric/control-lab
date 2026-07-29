import {useMemo, useState} from 'react';
import {Controls, Demo, Legend, Readout} from '@site/src/components/kit/Demo';
import {Slider} from '@site/src/components/kit/Slider';
import {poseExponential} from '@site/src/lib/domain/controlMath';

/* Desmos-style math explorers for the Localization & Odometry module: pure
   functions of their sliders (no animation loop, SSR-safe), in the same frame
   as the FilterMathDemos explorers. */

const W = 760;
const H = 360;

const MONO = 'JetBrains Mono, monospace';
const INK = '#e8eefc';
const MUTED = '#8294b8';
const BLUE = '#6f8bff';
const GREEN = '#5ce08a';
const AMBER = '#ffc24d';
const ROSE = '#ff6f9c';

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const deg = (rad: number) => (rad * 180) / Math.PI;

function path(points: [number, number][]) {
  return points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
}

function ExplorerDefs() {
  const heads: [string, string][] = [
    ['omdBlue', BLUE],
    ['omdGreen', GREEN],
    ['omdAmber', AMBER],
    ['omdRose', ROSE],
    ['omdGray', MUTED],
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

/** Small top-down robot glyph, rotated by `angleDeg` (screen degrees, CW). */
function Robot({x, y, angleDeg, color, ghost = false}: {x: number; y: number; angleDeg: number; color: string; ghost?: boolean}) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${angleDeg})`} opacity={ghost ? 0.55 : 1}>
      <rect x="-20" y="-14" width="40" height="28" rx="7" fill={ghost ? 'none' : '#16203a'} stroke={color} strokeWidth="2" strokeDasharray={ghost ? '5 4' : undefined} />
      <path d="M20 -8 L32 0 L20 8 Z" fill={color} />
    </g>
  );
}

/* sinC / cosC with their small-angle limits, for the readout labels only —
   the actual arc geometry is computed by the shared poseExponential(). Uses
   the same 1e-9 threshold as poseExponential so the displayed factors never
   disagree with the geometry they describe. */
function arcFactors(dTheta: number) {
  if (Math.abs(dTheta) < 1e-9) return {sinC: 1, cosC: dTheta / 2};
  return {sinC: Math.sin(dTheta) / dTheta, cosC: (1 - Math.cos(dTheta)) / dTheta};
}

/* ---------------------------------------------------------------------------
   Odometry: one loop's wheel rolls -> one arc step. Turn the two wheel deltas
   and the track width into ds, dθ, R, and the exact arc — next to the
   straight-line guess that drifts.
   --------------------------------------------------------------------------- */
export function ArcStepExplorer() {
  const [dL, setDL] = useState(0.55);
  const [dR, setDR] = useState(0.85);
  const [track, setTrack] = useState(0.35);

  const ds = (dL + dR) / 2;
  const dTheta = (dR - dL) / track;
  const {sinC, cosC} = arcFactors(dTheta); // display-only factors for the readout
  const {x: dx, y: dy} = poseExponential(ds, 0, dTheta); // robot-frame forward/left
  const straight = Math.abs(dTheta) < 0.02;
  const R = straight ? Infinity : ds / dTheta;

  const S: [number, number] = [220, 235]; // start pose, heading = screen +x
  const K = 250; // px per metre

  const geom = useMemo(() => {
    // exact arc sampled through the sweep; screen +y is down, robot +y (left) is up
    const arc: [number, number][] = [];
    const N = 48;
    for (let i = 0; i <= N; i++) {
      const t = i / N;
      const d = poseExponential(ds * t, 0, dTheta * t);
      arc.push([S[0] + d.x * K, S[1] - d.y * K]);
    }
    return {arc};
  }, [ds, dTheta]);

  const end: [number, number] = [S[0] + dx * K, S[1] - dy * K];
  const naive: [number, number] = [S[0] + ds * K, S[1]];
  const drift = Math.hypot(end[0] - naive[0], end[1] - naive[1]) / K;

  return (
    <Demo title="One loop, one arc: from wheel rolls to a pose step" pill="Math explorer">
      <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full rounded-xl bg-[#0b1120]" role="img" aria-label="Wheel deltas turned into an exact arc step, compared with the straight-line guess">
        <rect width={W} height={H} rx="18" fill="#0b1120" />
        <ExplorerDefs />
        {/* faint grid */}
        {Array.from({length: 8}, (_, i) => (
          <g key={i} stroke="rgba(255,255,255,0.06)">
            <line x1={70 + i * 90} y1={30} x2={70 + i * 90} y2={H - 30} />
            <line x1={40} y1={45 + i * 40} x2={W - 40} y2={45 + i * 40} />
          </g>
        ))}

        {/* straight-line guess along the old heading */}
        <line x1={S[0]} y1={S[1]} x2={naive[0]} y2={naive[1]} stroke={ROSE} strokeWidth="3" strokeDasharray="10 7" markerEnd="url(#omdRose)" />
        <text x={naive[0] + 10} y={naive[1] + 22} fill={ROSE} fontFamily={MONO} fontSize="12">straight guess (ds along old heading)</text>

        {/* the exact arc */}
        <path d={path(geom.arc)} fill="none" stroke={GREEN} strokeWidth="4.5" strokeLinecap="round" />

        {/* drift gap */}
        {!straight && (
          <g>
            <line x1={end[0]} y1={end[1]} x2={naive[0]} y2={naive[1]} stroke="#ffffff" strokeWidth="1.5" strokeDasharray="3 5" opacity="0.8" />
            <text x={(end[0] + naive[0]) / 2 + 10} y={(end[1] + naive[1]) / 2} fill="#ffffff" opacity="0.85" fontFamily={MONO} fontSize="12">
              drift {(drift * 100).toFixed(1)} cm
            </text>
          </g>
        )}

        {/* start + end robots (end rotated by dθ, CCW = negative screen angle) */}
        <Robot x={S[0]} y={S[1]} angleDeg={0} color={BLUE} />
        <text x={S[0] - 26} y={S[1] + 36} fill={BLUE} fontFamily={MONO} fontSize="12">start</text>
        <Robot x={end[0]} y={end[1]} angleDeg={-deg(dTheta)} color={GREEN} />
        <Robot x={naive[0]} y={naive[1]} angleDeg={-deg(dTheta)} color={ROSE} ghost />

        {/* the robot-frame components of the exact step */}
        <line x1={S[0]} y1={S[1]} x2={end[0]} y2={S[1]} stroke={AMBER} strokeWidth="2.5" strokeDasharray="6 5" markerEnd="url(#omdAmber)" />
        <line x1={end[0]} y1={S[1]} x2={end[0]} y2={end[1]} stroke={BLUE} strokeWidth="2.5" strokeDasharray="6 5" markerEnd="url(#omdBlue)" />
        <text x={(S[0] + end[0]) / 2 - 30} y={S[1] + 18} fill={AMBER} fontFamily={MONO} fontSize="12">Δx = ds·sinC</text>
        <text x={end[0] + 8} y={(S[1] + end[1]) / 2} fill={BLUE} fontFamily={MONO} fontSize="12">Δy = ds·cosC</text>
      </svg>
      <Controls>
        <Slider label="Left wheel rolled dL" min={-0.4} max={1.1} step={0.05} value={dL} onChange={setDL} format={(v) => `${v.toFixed(2)} m`} />
        <Slider label="Right wheel rolled dR" min={-0.4} max={1.1} step={0.05} value={dR} onChange={setDR} format={(v) => `${v.toFixed(2)} m`} />
        <Slider label="Track width T" min={0.25} max={0.5} step={0.01} value={track} onChange={setTrack} format={(v) => `${v.toFixed(2)} m`} />
      </Controls>
      <Readout
        items={[
          ['ds = (dL+dR)/2', `${ds.toFixed(2)} m`],
          ['dθ = (dR−dL)/T', `${deg(dTheta).toFixed(0)}°`],
          ['R = ds/dθ', straight ? '∞ (straight)' : `${R.toFixed(2)} m`],
          ['sinC · cosC', `${sinC.toFixed(3)} · ${cosC.toFixed(3)}`],
        ]}
      />
      <Legend
        items={[
          {color: GREEN, label: 'exact arc step'},
          {color: ROSE, label: 'straight-line guess'},
          {color: AMBER, label: 'forward component Δx'},
          {color: BLUE, label: 'sideways component Δy'},
        ]}
      />
    </Demo>
  );
}

/* ---------------------------------------------------------------------------
   atan2 vs atan: same Δy/Δx ratio, opposite directions. atan collapses the
   quadrants; atan2 keeps both signs and gets the full circle.
   --------------------------------------------------------------------------- */
export function Atan2Explorer() {
  const [dx, setDx] = useState(-1.4);
  const [dy, setDy] = useState(0.9);
  const O: [number, number] = [270, 185];
  const K = 92; // px per unit

  const theta = Math.atan2(dy, dx);
  const naive = Math.abs(dx) < 1e-9 ? null : Math.atan(dy / dx);
  const wrong = naive != null && Math.abs(theta - naive) > 1e-6;

  const tip: [number, number] = [O[0] + dx * K, O[1] - dy * K];
  const naiveTip: [number, number] | null =
    naive == null ? null : [O[0] + 1.55 * K * Math.cos(naive), O[1] - 1.55 * K * Math.sin(naive)];

  const arc = (a: number, r: number): string => {
    const n = 40;
    const pts: [number, number][] = Array.from({length: n}, (_, i) => {
      const t = (i / (n - 1)) * a;
      return [O[0] + r * Math.cos(t), O[1] - r * Math.sin(t)];
    });
    return path(pts);
  };

  return (
    <Demo title="atan2 vs atan: the sign of each leg matters" pill="Math explorer">
      <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full rounded-xl bg-[#0b1120]" role="img" aria-label="atan2 recovering the correct quadrant of a displacement while plain atan points the wrong way">
        <rect width={W} height={H} rx="18" fill="#0b1120" />
        <ExplorerDefs />

        {/* axes */}
        <line x1={O[0] - 215} y1={O[1]} x2={O[0] + 215} y2={O[1]} stroke="#31405f" strokeWidth="2" />
        <line x1={O[0]} y1={O[1] - 150} x2={O[0]} y2={O[1] + 150} stroke="#31405f" strokeWidth="2" />
        <text x={O[0] + 220} y={O[1] - 8} fill={MUTED} fontFamily={MONO} fontSize="13">+Δx</text>
        <text x={O[0] + 10} y={O[1] - 152} fill={MUTED} fontFamily={MONO} fontSize="13">+Δy</text>

        {/* triangle legs */}
        <line x1={O[0]} y1={O[1]} x2={tip[0]} y2={O[1]} stroke={AMBER} strokeWidth="3" strokeDasharray="8 6" />
        <line x1={tip[0]} y1={O[1]} x2={tip[0]} y2={tip[1]} stroke={GREEN} strokeWidth="3" strokeDasharray="8 6" />
        <text x={(O[0] + tip[0]) / 2} y={O[1] + (dy >= 0 ? 22 : -12)} fill={AMBER} fontFamily={MONO} fontSize="13" textAnchor="middle">Δx</text>
        <text x={tip[0] + (dx >= 0 ? 12 : -12)} y={(O[1] + tip[1]) / 2 + 4} fill={GREEN} fontFamily={MONO} fontSize="13" textAnchor={dx >= 0 ? 'start' : 'end'}>Δy</text>

        {/* the naive atan direction — same ratio, possibly opposite side */}
        {naiveTip && wrong && (
          <g>
            <line x1={O[0]} y1={O[1]} x2={naiveTip[0]} y2={naiveTip[1]} stroke={ROSE} strokeWidth="3.5" strokeDasharray="4 6" markerEnd="url(#omdRose)" />
            <text x={naiveTip[0] + (naiveTip[0] > O[0] ? 10 : -10)} y={naiveTip[1] + 16} fill={ROSE} fontFamily={MONO} fontSize="12" textAnchor={naiveTip[0] > O[0] ? 'start' : 'end'}>
              atan(Δy/Δx) points HERE
            </text>
          </g>
        )}

        {/* the true displacement */}
        <line x1={O[0]} y1={O[1]} x2={tip[0]} y2={tip[1]} stroke={BLUE} strokeWidth="5" strokeLinecap="round" markerEnd="url(#omdBlue)" />
        <circle cx={tip[0]} cy={tip[1]} r="7" fill={AMBER} />
        <text x={tip[0] + (dx >= 0 ? 14 : -14)} y={tip[1] - 10} fill={AMBER} fontFamily={MONO} fontSize="13" textAnchor={dx >= 0 ? 'start' : 'end'}>target</text>

        {/* angle arcs from the +x axis */}
        <path d={arc(theta, 56)} fill="none" stroke={GREEN} strokeWidth="3.5" />
        {naive != null && wrong && <path d={arc(naive, 40)} fill="none" stroke={ROSE} strokeWidth="2.5" />}

        {/* verdict box */}
        <g fontFamily={MONO} fontSize="13">
          <rect x={520} y={44} width={216} height={92} rx="10" fill="rgba(11,17,32,0.75)" stroke="rgba(255,255,255,0.12)" />
          <text x={536} y={72} fill={GREEN}>atan2 → {deg(theta).toFixed(0)}°</text>
          <text x={536} y={98} fill={naive == null ? ROSE : wrong ? ROSE : GREEN}>
            {naive == null ? 'atan → Δx = 0: ÷0!' : `atan  → ${deg(naive).toFixed(0)}°`}
          </text>
          <text x={536} y={124} fill={naive == null || wrong ? ROSE : MUTED}>
            {naive == null ? 'undefined' : wrong ? 'wrong by 180°!' : 'agrees (Δx > 0)'}
          </text>
        </g>
      </svg>
      <Controls>
        <Slider label="Δx" min={-2} max={2} step={0.1} value={dx} onChange={setDx} format={(v) => v.toFixed(1)} />
        <Slider label="Δy" min={-2} max={2} step={0.1} value={dy} onChange={setDy} format={(v) => v.toFixed(1)} />
      </Controls>
      <Readout
        items={[
          ['ratio Δy/Δx', Math.abs(dx) < 1e-9 ? '÷0' : (dy / dx).toFixed(2)],
          ['atan2(Δy, Δx)', `${deg(theta).toFixed(1)}°`],
          ['quadrant', `${dx >= 0 ? (dy >= 0 ? 'I' : 'IV') : dy >= 0 ? 'II' : 'III'}`],
        ]}
      />
      <Legend
        items={[
          {color: BLUE, label: 'true displacement'},
          {color: GREEN, label: 'atan2 — full ±180° answer'},
          {color: ROSE, label: 'plain atan — quadrant collapsed'},
        ]}
      />
    </Demo>
  );
}

/* ---------------------------------------------------------------------------
   Pose exponential: one body twist (forward, strafe, turn) integrated exactly
   through V(Δθ) versus stepped straight by Euler. The gap IS the corner cut.
   --------------------------------------------------------------------------- */
export function TwistExplorer() {
  const [dxb, setDxb] = useState(0.9); // forward (m)
  const [dyb, setDyb] = useState(0.25); // strafe left (m)
  const [dThetaDeg, setDThetaDeg] = useState(75);

  const dTheta = (dThetaDeg * Math.PI) / 180;
  const {sinC, cosC} = arcFactors(dTheta); // display-only factors for the readout
  // local displacement = V(dθ) · body twist
  const {x: lx, y: ly} = poseExponential(dxb, dyb, dTheta);

  const S: [number, number] = [235, 245];
  const K = 240;

  const exact: [number, number] = [S[0] + lx * K, S[1] - ly * K];
  const euler: [number, number] = [S[0] + dxb * K, S[1] - dyb * K];
  const gap = Math.hypot(exact[0] - euler[0], exact[1] - euler[1]) / K;

  const curve = useMemo(() => {
    // the true constant-twist path: exp(t·ξ) for t in [0,1]
    const pts: [number, number][] = [];
    const N = 56;
    for (let i = 0; i <= N; i++) {
      const t = i / N;
      const d = poseExponential(dxb * t, dyb * t, dTheta * t);
      pts.push([S[0] + d.x * K, S[1] - d.y * K]);
    }
    return pts;
  }, [dxb, dyb, dTheta]);

  return (
    <Demo title="One twist, two integrators: exp(ξ) vs the straight step" pill="Math explorer">
      <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full rounded-xl bg-[#0b1120]" role="img" aria-label="A body twist integrated exactly by the pose exponential versus stepped straight by Euler">
        <rect width={W} height={H} rx="18" fill="#0b1120" />
        <ExplorerDefs />
        {Array.from({length: 8}, (_, i) => (
          <g key={i} stroke="rgba(255,255,255,0.06)">
            <line x1={70 + i * 90} y1={30} x2={70 + i * 90} y2={H - 30} />
            <line x1={40} y1={45 + i * 40} x2={W - 40} y2={45 + i * 40} />
          </g>
        ))}

        {/* Euler: apply the body motion straight, rotate at the end */}
        <line x1={S[0]} y1={S[1]} x2={euler[0]} y2={euler[1]} stroke={ROSE} strokeWidth="3" strokeDasharray="10 7" markerEnd="url(#omdRose)" />
        <text x={euler[0] + 12} y={euler[1] + 24} fill={ROSE} fontFamily={MONO} fontSize="12">Euler: chord across the arc</text>

        {/* the true constant-twist path */}
        <path d={path(curve)} fill="none" stroke={GREEN} strokeWidth="4.5" strokeLinecap="round" />
        <text x={exact[0] - 6} y={exact[1] - 26} fill={GREEN} fontFamily={MONO} fontSize="12" textAnchor="end">exp(ξ∧): rides the arc</text>

        {/* the gap */}
        <line x1={exact[0]} y1={exact[1]} x2={euler[0]} y2={euler[1]} stroke="#ffffff" strokeWidth="1.5" strokeDasharray="3 5" opacity="0.8" />
        <text x={(exact[0] + euler[0]) / 2 + 10} y={(exact[1] + euler[1]) / 2 + 4} fill="#ffffff" opacity="0.85" fontFamily={MONO} fontSize="12">
          {(gap * 100).toFixed(1)} cm / loop
        </text>

        {/* robots */}
        <Robot x={S[0]} y={S[1]} angleDeg={0} color={BLUE} />
        <text x={S[0] - 26} y={S[1] + 38} fill={BLUE} fontFamily={MONO} fontSize="12">start</text>
        <Robot x={exact[0]} y={exact[1]} angleDeg={-dThetaDeg} color={GREEN} />
        <Robot x={euler[0]} y={euler[1]} angleDeg={-dThetaDeg} color={ROSE} ghost />
      </svg>
      <Controls>
        <Slider label="Forward Δx_b" min={0} max={1.2} step={0.05} value={dxb} onChange={setDxb} format={(v) => `${v.toFixed(2)} m`} />
        <Slider label="Strafe Δy_b (+left)" min={-0.6} max={0.6} step={0.05} value={dyb} onChange={setDyb} format={(v) => `${v.toFixed(2)} m`} />
        <Slider label="Turn Δθ" min={-120} max={120} step={5} value={dThetaDeg} onChange={setDThetaDeg} format={(v) => `${v.toFixed(0)}°`} />
      </Controls>
      <Readout
        items={[
          ['V(Δθ) factors: sin/Δθ · (1−cos)/Δθ', `${sinC.toFixed(3)} · ${cosC.toFixed(3)}`],
          ['exact local step (Δx, Δy)', `(${lx.toFixed(2)}, ${ly.toFixed(2)}) m`],
          ['Euler step (Δx_b, Δy_b)', `(${dxb.toFixed(2)}, ${dyb.toFixed(2)}) m`],
          ['gap per loop', `${(gap * 100).toFixed(1)} cm`],
        ]}
      />
      <Legend
        items={[
          {color: GREEN, label: 'pose exponential — exact'},
          {color: ROSE, label: 'Euler — straight then rotate'},
          {color: BLUE, label: 'start pose'},
        ]}
      />
    </Demo>
  );
}
