import {useMemo, useState} from 'react';
import {Demo, Controls, Buttons, Button, Readout, Legend} from '@site/src/components/kit/Demo';
import {Slider} from '@site/src/components/kit/Slider';
import {wrapDegrees} from '@site/src/lib/controlMath';

const W = 720;
const H = 360;
const CX = 250;
const CY = 176;
const R = 118;
const MONO = 'JetBrains Mono, monospace';

function rad(degrees: number) {
  return (degrees * Math.PI) / 180;
}

function point(degrees: number, radius = R): [number, number] {
  const a = rad(degrees);
  return [CX + Math.cos(a) * radius, CY - Math.sin(a) * radius];
}

function arcPath(start: number, delta: number, radius: number, samples = 64) {
  const n = Math.max(2, Math.ceil(Math.abs(delta) / 6), samples);
  return Array.from({length: n}, (_, i) => {
    const t = i / (n - 1);
    const [x, y] = point(start + delta * t, radius);
    return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(' ');
}

function fmt(degrees: number) {
  return `${degrees >= 0 ? '+' : ''}${degrees.toFixed(1)} deg`;
}

export default function AngleWrap() {
  const [current, setCurrent] = useState(179);
  const [target, setTarget] = useState(-179);

  const rawError = target - current;
  const wrappedError = wrapDegrees(rawError);
  const currentPoint = point(current);
  const targetPoint = point(target);
  const rawPath = useMemo(() => arcPath(current, rawError, R + 8, 80), [current, rawError]);
  const wrappedPath = useMemo(() => arcPath(current, wrappedError, R - 8, 24), [current, wrappedError]);

  return (
    <Demo title="Angle wrapping: compare raw subtraction with shortest signed rotation">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="block h-auto w-full rounded-xl bg-[#0b1120]"
        role="img"
        aria-label="Interactive angle wrapping dial comparing raw and wrapped heading error">
        <defs>
          <marker id="angleWrapBlue" markerWidth="9" markerHeight="9" refX="8" refY="4.5" orient="auto" viewBox="0 0 9 9">
            <path d="M0 0 L9 4.5 L0 9 Z" fill="#6f8bff" />
          </marker>
          <marker id="angleWrapGreen" markerWidth="9" markerHeight="9" refX="8" refY="4.5" orient="auto" viewBox="0 0 9 9">
            <path d="M0 0 L9 4.5 L0 9 Z" fill="#5ce08a" />
          </marker>
          <marker id="angleWrapRose" markerWidth="9" markerHeight="9" refX="8" refY="4.5" orient="auto" viewBox="0 0 9 9">
            <path d="M0 0 L9 4.5 L0 9 Z" fill="#ff6f9c" />
          </marker>
        </defs>

        <rect width={W} height={H} rx="18" fill="#0b1120" />
        <circle cx={CX} cy={CY} r={R} fill="#101a2e" stroke="#31405f" strokeWidth="2" />
        <line x1={CX - R - 18} x2={CX + R + 18} y1={CY} y2={CY} stroke="#31405f" />
        <line x1={CX} x2={CX} y1={CY - R - 18} y2={CY + R + 18} stroke="#31405f" />

        {[0, 90, 180, -90].map((d) => {
          const [x1, y1] = point(d, R - 12);
          const [x2, y2] = point(d, R);
          const [lx, ly] = point(d, R + 24);
          return (
            <g key={d}>
              <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#8294b8" strokeWidth="2" />
              <text x={lx} y={ly + 4} fill="#8294b8" textAnchor="middle" fontFamily={MONO} fontSize="12">
                {d === 180 ? '+/-180 deg' : `${d} deg`}
              </text>
            </g>
          );
        })}

        <line
          x1={point(180, R - 18)[0]}
          y1={point(180, R - 18)[1]}
          x2={point(180, R + 18)[0]}
          y2={point(180, R + 18)[1]}
          stroke="#ffc24d"
          strokeWidth="2"
          strokeDasharray="5 5"
        />

        <path d={rawPath} fill="none" stroke="#ff6f9c" strokeWidth="3.5" strokeLinecap="round" markerEnd="url(#angleWrapRose)" opacity="0.75" />
        <path d={wrappedPath} fill="none" stroke="#5ce08a" strokeWidth="5" strokeLinecap="round" markerEnd="url(#angleWrapGreen)" />

        <line x1={CX} y1={CY} x2={currentPoint[0]} y2={currentPoint[1]} stroke="#6f8bff" strokeWidth="4" markerEnd="url(#angleWrapBlue)" />
        <line x1={CX} y1={CY} x2={targetPoint[0]} y2={targetPoint[1]} stroke="#ffc24d" strokeWidth="3" strokeDasharray="7 6" />
        <circle cx={targetPoint[0]} cy={targetPoint[1]} r="7" fill="#ffc24d" />
        <circle cx={currentPoint[0]} cy={currentPoint[1]} r="7" fill="#6f8bff" />

        <g transform="translate(455 76)" fontFamily={MONO}>
          <rect x="0" y="0" width="220" height="164" rx="14" fill="rgba(16,26,46,0.92)" stroke="rgba(255,255,255,0.12)" />
          <text x="18" y="34" fill="#e8eefc" fontSize="14">target - current</text>
          <text x="18" y="62" fill="#ff9bbb" fontSize="20" fontWeight="700">{fmt(rawError)}</text>
          <text x="18" y="98" fill="#e8eefc" fontSize="14">wrap(raw error)</text>
          <text x="18" y="126" fill="#8ff0b0" fontSize="20" fontWeight="700">{fmt(wrappedError)}</text>
          <text x="18" y="150" fill="#8294b8" fontSize="12">controller should use green</text>
        </g>
      </svg>

      <Controls>
        <Slider label="Current heading" min={-180} max={180} step={1} value={current} onChange={setCurrent} format={(v) => `${v.toFixed(0)} deg`} />
        <Slider label="Target heading" min={-180} max={180} step={1} value={target} onChange={setTarget} format={(v) => `${v.toFixed(0)} deg`} />
      </Controls>
      <Buttons>
        <Button onClick={() => { setCurrent(179); setTarget(-179); }}>Seam bug</Button>
        <Button onClick={() => { setCurrent(-90); setTarget(45); }}>Normal turn</Button>
        <Button onClick={() => { setCurrent(170); setTarget(10); }}>Large turn</Button>
      </Buttons>
      <Readout
        items={[
          ['raw error', fmt(rawError)],
          ['wrapped error', fmt(wrappedError)],
          ['wrong-way extra rotation', `${Math.max(0, Math.abs(rawError) - Math.abs(wrappedError)).toFixed(1)} deg`],
        ]}
      />
      <Legend
        items={[
          {color: '#5ce08a', label: 'wrapped shortest rotation'},
          {color: '#ff6f9c', label: 'raw subtraction path'},
          {color: '#6f8bff', label: 'current heading'},
          {color: '#ffc24d', label: 'target heading'},
        ]}
      />
    </Demo>
  );
}
