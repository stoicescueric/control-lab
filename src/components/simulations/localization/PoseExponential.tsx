import {useState} from 'react';
import {Demo, Controls, Buttons, Button, Readout, Legend} from '@site/src/components/kit/Demo';
import {Slider} from '@site/src/components/kit/Slider';

/* Euler vs. exact (pose-exponential) integration of a CONSTANT body twist.
   The robot holds the same forward speed and turn rate every loop, so the true
   path is a perfect circle. The pose exponential lands exactly on that circle;
   naive Euler ("step straight, then rotate") cuts every chord and spirals
   outward. Coarser steps (bigger dθ) make the gap explode. Pure React + SVG,
   SSR-safe — the view auto-fits both trajectories. */

const W = 640;
const H = 360;
const R0 = 1; // true turning radius in arbitrary units (view auto-fits)

type P = {x: number; y: number};

function integrate(dth: number, n: number, exact: boolean): P[] {
  let x = 0,
    y = 0,
    th = 0;
  const v = R0 * dth; // constant arc length per step so the true radius stays R0
  const out: P[] = [{x, y}];
  for (let i = 0; i < n; i++) {
    if (exact) {
      const sinc = Math.abs(dth) < 1e-9 ? 1 : Math.sin(dth) / dth;
      const cosc = Math.abs(dth) < 1e-9 ? 0 : (1 - Math.cos(dth)) / dth;
      const lx = v * sinc;
      const ly = v * cosc;
      x += lx * Math.cos(th) - ly * Math.sin(th);
      y += lx * Math.sin(th) + ly * Math.cos(th);
    } else {
      x += v * Math.cos(th); // step straight along current heading...
      y += v * Math.sin(th);
    }
    th += dth; // ...then rotate
    out.push({x, y});
  }
  return out;
}

export function PoseExponential() {
  const [dthDeg, setDthDeg] = useState(30);
  const [steps, setSteps] = useState(8);

  const dth = (dthDeg * Math.PI) / 180;
  const euler = integrate(dth, steps, false);
  const exp = integrate(dth, steps, true);
  const fine = integrate(dth / 10, steps * 10, true); // smooth true circle

  // auto-fit all points into the canvas
  const all = [...euler, ...fine];
  const xs = all.map((p) => p.x);
  const ys = all.map((p) => p.y);
  const minX = Math.min(...xs),
    maxX = Math.max(...xs),
    minY = Math.min(...ys),
    maxY = Math.max(...ys);
  const pad = 36;
  const s = Math.min((W - 2 * pad) / (maxX - minX || 1), (H - 2 * pad) / (maxY - minY || 1));
  const ox = pad + ((W - 2 * pad) - s * (maxX - minX)) / 2;
  const oy = pad + ((H - 2 * pad) - s * (maxY - minY)) / 2;
  const X = (p: P) => ox + s * (p.x - minX);
  const Y = (p: P) => H - (oy + s * (p.y - minY)); // flip: math y-up -> svg y-down
  const path = (pts: P[]) => `M ${pts.map((p) => `${X(p).toFixed(1)} ${Y(p).toFixed(1)}`).join(' L ')}`;

  const last = (a: P[]) => a[a.length - 1];
  const gap = Math.hypot(last(euler).x - last(exp).x, last(euler).y - last(exp).y);
  const pathLen = R0 * dth * steps;
  const errPct = pathLen < 1e-6 ? 0 : (gap / pathLen) * 100;

  return (
    <Demo title="Euler vs. pose exponential: integrating one constant twist">
      <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full rounded-xl bg-[#0b1120]" role="img" aria-label="Euler straight-step integration spiraling off the true circle traced by the pose exponential">
        {/* true circle (the exact integral of a constant twist) */}
        <path d={path(fine)} fill="none" stroke="#6f8bff" strokeWidth="3" opacity="0.55" />

        {/* Euler trajectory */}
        <path d={path(euler)} fill="none" stroke="#ff6f9c" strokeWidth="2.5" strokeDasharray="2 0" />
        {euler.map((p, i) => (
          <circle key={`e${i}`} cx={X(p)} cy={Y(p)} r="3.2" fill="#ff6f9c" />
        ))}

        {/* pose-exponential step markers (land on the circle) */}
        {exp.map((p, i) => (
          <circle key={`x${i}`} cx={X(p)} cy={Y(p)} r="3.8" fill="#6f8bff" />
        ))}

        {/* endpoint gap */}
        <line x1={X(last(euler))} y1={Y(last(euler))} x2={X(last(exp))} y2={Y(last(exp))} stroke="#ffc24d" strokeWidth="2" strokeDasharray="4 3" />

        {/* start marker */}
        <circle cx={X(euler[0])} cy={Y(euler[0])} r="5" fill="none" stroke="#8294b8" strokeWidth="2" />
        <text x={X(euler[0]) + 9} y={Y(euler[0]) + 4} fontFamily="JetBrains Mono, monospace" fontSize="12" fill="#8294b8">
          start
        </text>
      </svg>

      <Controls>
        <Slider label="Turn per step dθ" min={5} max={70} step={1} value={dthDeg} onChange={setDthDeg} format={(v) => `${v.toFixed(0)}°`} />
        <Slider label="Steps integrated" min={2} max={16} step={1} value={steps} onChange={setSteps} format={(v) => v.toFixed(0)} />
      </Controls>
      <Buttons>
        <Button
          onClick={() => {
            setDthDeg(30);
            setSteps(8);
          }}>
          Reset
        </Button>
      </Buttons>
      <Readout
        items={[
          ['true radius', 'constant (one circle)'],
          ['Euler endpoint error', `${errPct.toFixed(1)}% of path`],
          ['finer steps ⇒', 'error shrinks'],
        ]}
      />
      <Legend
        items={[
          {color: '#6f8bff', label: 'pose exponential — exact arc'},
          {color: '#ff6f9c', label: 'Euler — straight steps (cuts corners)'},
          {color: '#ffc24d', label: 'accumulated endpoint error'},
        ]}
      />
    </Demo>
  );
}

export default PoseExponential;
