import {useMemo, useState} from 'react';
import {Controls, Demo, Legend, Readout} from '@site/src/components/kit/Demo';
import {Slider} from '@site/src/components/kit/Slider';

const W = 760;
const H = 340;
const P = {l: 62, r: 32, t: 36, b: 58};
const PW = W - P.l - P.r;
const PH = H - P.t - P.b;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function sx(x: number, min: number, max: number) {
  return P.l + ((x - min) / (max - min)) * PW;
}

function sy(y: number, min: number, max: number) {
  return P.t + (1 - (y - min) / (max - min)) * PH;
}

function path(points: [number, number][]) {
  return points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
}

function gaussian(x: number, mean: number, variance: number) {
  const sigma = Math.sqrt(Math.max(variance, 0.01));
  return Math.exp(-0.5 * ((x - mean) / sigma) ** 2) / sigma;
}

function Grid({xLabel, yLabel}: {xLabel: string; yLabel: string}) {
  return (
    <g>
      <rect width={W} height={H} rx="18" fill="#0b1120" />
      {Array.from({length: 7}, (_, i) => {
        const x = P.l + (i / 6) * PW;
        return <line key={`x-${i}`} x1={x} x2={x} y1={P.t} y2={H - P.b} stroke="rgba(255,255,255,0.07)" />;
      })}
      {Array.from({length: 5}, (_, i) => {
        const y = P.t + (i / 4) * PH;
        return <line key={`y-${i}`} x1={P.l} x2={W - P.r} y1={y} y2={y} stroke="rgba(255,255,255,0.07)" />;
      })}
      <line x1={P.l} x2={W - P.r} y1={H - P.b} y2={H - P.b} stroke="rgba(255,255,255,0.34)" />
      <line x1={P.l} x2={P.l} y1={P.t} y2={H - P.b} stroke="rgba(255,255,255,0.34)" />
      <text x={W / 2} y={H - 18} fill="#8294b8" textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="13">
        {xLabel}
      </text>
      <text x="22" y={H / 2} fill="#8294b8" textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="13" transform={`rotate(-90 22 ${H / 2})`}>
        {yLabel}
      </text>
    </g>
  );
}

export function KalmanGainExplorer() {
  const [prediction, setPrediction] = useState(1.1);
  const [measurement, setMeasurement] = useState(-0.7);
  const [pVar, setPVar] = useState(0.75);
  const [rVar, setRVar] = useState(0.35);
  const min = -3;
  const max = 3;
  const gain = pVar / (pVar + rVar);
  const innovation = measurement - prediction;
  const estimate = prediction + gain * innovation;
  const posteriorVar = (1 - gain) * pVar;

  const curves = useMemo(() => {
    const xs = Array.from({length: 180}, (_, i) => min + (i / 179) * (max - min));
    const predPeak = gaussian(prediction, prediction, pVar);
    const measPeak = gaussian(measurement, measurement, rVar);
    const estPeak = gaussian(estimate, estimate, posteriorVar);
    const peak = Math.max(predPeak, measPeak, estPeak);
    const toCurve = (mean: number, variance: number) =>
      xs.map((x) => [sx(x, min, max), sy(gaussian(x, mean, variance) / peak, 0, 1.08)] as [number, number]);
    return {
      prediction: toCurve(prediction, pVar),
      measurement: toCurve(measurement, rVar),
      estimate: toCurve(estimate, posteriorVar),
    };
  }, [prediction, measurement, pVar, rVar, estimate, posteriorVar]);

  return (
    <Demo title="Kalman gain: covariance decides who gets believed">
      <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full rounded-xl bg-[#0b1120]" role="img" aria-label="Interactive Kalman gain Gaussian blend">
        <Grid xLabel="state value" yLabel="relative probability" />
        <path d={path(curves.prediction)} fill="none" stroke="#6f8bff" strokeWidth="4" strokeLinecap="round" />
        <path d={path(curves.measurement)} fill="none" stroke="#ff6f9c" strokeWidth="4" strokeLinecap="round" />
        <path d={path(curves.estimate)} fill="none" stroke="#5ce08a" strokeWidth="5" strokeLinecap="round" />
        {[
          ['prediction', prediction, '#6f8bff'],
          ['measurement', measurement, '#ff6f9c'],
          ['estimate', estimate, '#5ce08a'],
        ].map(([label, value, color]) => (
          <g key={label}>
            <line x1={sx(value as number, min, max)} x2={sx(value as number, min, max)} y1={P.t + 4} y2={H - P.b} stroke={color as string} strokeWidth="2" strokeDasharray="7 7" />
            <text x={sx(value as number, min, max)} y={P.t + 18} fill={color as string} textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="12">
              {label as string}
            </text>
          </g>
        ))}
        <text x="380" y="70" fill="#e8eefc" textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="15">
          estimate = prediction + K * innovation
        </text>
      </svg>
      <Controls>
        <Slider label="Prediction mean" min={-2.5} max={2.5} step={0.1} value={prediction} onChange={setPrediction} format={(v) => v.toFixed(1)} />
        <Slider label="Measurement mean" min={-2.5} max={2.5} step={0.1} value={measurement} onChange={setMeasurement} format={(v) => v.toFixed(1)} />
        <Slider label="Prediction variance P" min={0.08} max={2.5} step={0.02} value={pVar} onChange={setPVar} format={(v) => v.toFixed(2)} />
        <Slider label="Measurement variance R" min={0.08} max={2.5} step={0.02} value={rVar} onChange={setRVar} format={(v) => v.toFixed(2)} />
      </Controls>
      <Readout
        items={[
          ['Kalman gain K', gain.toFixed(2)],
          ['innovation z - Hx', innovation.toFixed(2)],
          ['posterior variance', posteriorVar.toFixed(2)],
        ]}
      />
      <Legend
        items={[
          {color: '#6f8bff', label: 'model prediction'},
          {color: '#ff6f9c', label: 'sensor measurement'},
          {color: '#5ce08a', label: 'corrected estimate'},
        ]}
      />
    </Demo>
  );
}

export function AprilTagProjectionExplorer() {
  const [x, setX] = useState(-1.8);
  const [y, setY] = useState(-0.8);
  const [headingDeg, setHeadingDeg] = useState(20);
  const min = -3;
  const max = 3;
  const theta = (headingDeg * Math.PI) / 180;
  const c = Math.cos(theta);
  const s = Math.sin(theta);
  const tag = {x: 0, y: 0};
  const dx = tag.x - x;
  const dy = tag.y - y;
  const forward = Math.max(0.18, c * dx + s * dy);
  const right = -s * dx + c * dy;
  const focal = 1.0;
  const tagWidth = 0.35;
  const imageU = clamp(focal * right / forward, -1.25, 1.25);
  const imageSize = clamp((focal * tagWidth) / forward, 0.08, 0.9);
  const imgCx = 565;
  const imgCy = 165;
  const imgW = 250;
  const imgH = 172;
  const tagPx = imgCx + imageU * 82;
  const tagSizePx = imageSize * 116;
  const dudForward = -focal * right / (forward * forward);
  const dudRight = focal / forward;
  const dsdForward = -focal * tagWidth / (forward * forward);
  const dForwardDx = -c;
  const dForwardDy = -s;
  const dForwardDtheta = right;
  const dRightDx = s;
  const dRightDy = -c;
  const dRightDtheta = -forward;
  const dudx = dudForward * dForwardDx + dudRight * dRightDx;
  const dudy = dudForward * dForwardDy + dudRight * dRightDy;
  const dudtheta = dudForward * dForwardDtheta + dudRight * dRightDtheta;
  const dsdx = dsdForward * dForwardDx;
  const dsdy = dsdForward * dForwardDy;
  const dsdtheta = dsdForward * dForwardDtheta;
  const fieldX = (value: number) => 24 + ((value - min) / (max - min)) * 306;
  const fieldY = (value: number) => 24 + (1 - (value - min) / (max - min)) * 218;
  const robotFieldX = fieldX(x);
  const robotFieldY = fieldY(y);
  const tagFieldX = fieldX(tag.x);
  const tagFieldY = fieldY(tag.y);
  const noseFieldX = robotFieldX + Math.cos(theta) * 52;
  const noseFieldY = robotFieldY - Math.sin(theta) * 52;

  return (
    <Demo title="AprilTag Jacobian: pose changes become image changes">
      <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full rounded-xl bg-[#0b1120]" role="img" aria-label="Interactive AprilTag projection Jacobian">
        <defs>
          <marker id="tagNoseArrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto" viewBox="0 0 8 8">
            <path d="M0 0 L8 4 L0 8 Z" fill="#ffc24d" />
          </marker>
        </defs>
        <rect width={W} height={H} rx="18" fill="#0b1120" />
        <g transform="translate(30 18)">
          <rect x="0" y="0" width="355" height="264" rx="14" fill="#101a2e" stroke="#2a3656" />
          {Array.from({length: 5}, (_, i) => {
            const gx = 34 + i * 72;
            const gy = 30 + i * 48;
            return (
              <g key={i}>
                <line x1={gx} x2={gx} y1="24" y2="242" stroke="rgba(255,255,255,0.07)" />
                <line x1="24" x2="330" y1={gy} y2={gy} stroke="rgba(255,255,255,0.07)" />
              </g>
            );
          })}
          <line x1={tagFieldX} y1={tagFieldY} x2={robotFieldX} y2={robotFieldY} stroke="#6f8bff" strokeWidth="3" strokeLinecap="round" />
          <rect x={tagFieldX - 14} y={tagFieldY - 14} width="28" height="28" rx="4" fill="#ff6f9c" />
          <text x={tagFieldX + 22} y={tagFieldY + 4} fill="#ffb7cc" fontFamily="JetBrains Mono, monospace" fontSize="12">AprilTag</text>
          <g transform={`translate(${robotFieldX} ${robotFieldY}) rotate(${-headingDeg})`}>
            <rect x="-24" y="-16" width="48" height="32" rx="7" fill="#16203a" stroke="#ffffff" />
            <path d="M-8 -9 L20 0 L-8 9 Z" fill="#ffc24d" />
          </g>
          <line x1={robotFieldX} y1={robotFieldY} x2={noseFieldX} y2={noseFieldY} stroke="#ffc24d" strokeWidth="4" markerEnd="url(#tagNoseArrow)" />
          <text x="178" y="246" fill="#8294b8" textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="13">field pose</text>
        </g>

        <g transform="translate(438 54)">
          <rect x="0" y="0" width={imgW} height={imgH} rx="14" fill="#101a2e" stroke="#2a3656" />
          <line x1={imgW / 2} x2={imgW / 2} y1="18" y2={imgH - 18} stroke="rgba(255,255,255,0.12)" strokeDasharray="7 7" />
          <rect
            x={tagPx - 438 - tagSizePx / 2}
            y={imgCy - tagSizePx / 2 - 54}
            width={tagSizePx}
            height={tagSizePx}
            rx="6"
            fill="#ff6f9c"
            stroke="#ffc24d"
            strokeWidth="3"
          />
          <circle cx={tagPx - 438} cy={imgCy - 54} r="5" fill="#ffffff" />
          <text x={imgW / 2} y="196" fill="#8294b8" textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="13">camera image</text>
          <text x="16" y="24" fill="#e8eefc" fontFamily="JetBrains Mono, monospace" fontSize="12">u = horizontal pixel offset</text>
          <text x="16" y="46" fill="#e8eefc" fontFamily="JetBrains Mono, monospace" fontSize="12">s = apparent tag size</text>
        </g>

        <g fontFamily="JetBrains Mono, monospace" fontSize="12">
          <rect x="438" y="252" width="250" height="54" rx="10" fill="rgba(11,17,32,0.72)" stroke="rgba(255,255,255,0.10)" />
          <text x="454" y="274" fill="#5ce08a">image center moves with pose</text>
          <text x="454" y="296" fill="#ffc24d">tag size grows as depth shrinks</text>
        </g>
      </svg>
      <Controls>
        <Slider label="Robot x" min={-2.8} max={-0.3} step={0.1} value={x} onChange={setX} format={(v) => v.toFixed(1)} />
        <Slider label="Robot y" min={-2.3} max={2.3} step={0.1} value={y} onChange={setY} format={(v) => v.toFixed(1)} />
        <Slider label="Robot heading" min={-55} max={55} step={1} value={headingDeg} onChange={setHeadingDeg} format={(v) => `${v.toFixed(0)} deg`} />
      </Controls>
      <Readout
        items={[
          ['forward depth Xc', forward.toFixed(2)],
          ['side offset Yc', right.toFixed(2)],
          ['image row du/dx,du/dy,du/dtheta', `[${dudx.toFixed(2)}, ${dudy.toFixed(2)}, ${dudtheta.toFixed(2)}]`],
          ['size row ds/dx,ds/dy,ds/dtheta', `[${dsdx.toFixed(2)}, ${dsdy.toFixed(2)}, ${dsdtheta.toFixed(2)}]`],
        ]}
      />
      <Legend
        items={[
          {color: '#6f8bff', label: 'field ray from camera to tag'},
          {color: '#ff6f9c', label: 'detected AprilTag square'},
          {color: '#ffc24d', label: 'camera forward direction'},
        ]}
      />
    </Demo>
  );
}
