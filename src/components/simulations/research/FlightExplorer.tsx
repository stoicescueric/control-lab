import {useMemo, useState} from 'react';
import {Button, Buttons, Controls, Demo, Legend} from '@site/src/components/kit/Demo';
import {Slider} from '@site/src/components/kit/Slider';
import {
  CD,
  entryInterval,
  entersGoal,
  GOAL_DEPTH,
  H0,
  H_RIM,
  hermitePosition,
  INCH,
  simulateDrag,
  simulateVacuum,
  type Pt,
  type RimEvent,
} from '@site/src/lib/domain/projectile';
import {colors} from './ResearchFigures';
import styles from './Research.module.css';

export function TrajectoryPlot({
  speed,
  angle,
  distance = 70,
  dragCoefficient = CD,
  vacuum = false,
}: {
  speed: number;
  angle: number;
  distance?: number;
  dragCoefficient?: number;
  vacuum?: boolean;
}) {
  const flight = useMemo(
    () => simulateDrag({v0: speed, angle: (angle * Math.PI) / 180, dt: 0.005, dragCoefficient}),
    [speed, angle, dragCoefficient],
  );
  const vac = simulateVacuum(speed, (angle * Math.PI) / 180);
  const [lo, hi] = entryInterval(distance * INCH);
  const xmax = Math.max(
    3.2,
    (distance * INCH + GOAL_DEPTH) * 1.1,
    flight.range,
    vacuum ? vac.range : 0,
  );
  const ymax = Math.max(1.8, flight.peak * 1.2, vacuum ? vac.apex * 1.2 : 0);
  const sx = (x: number) => 45 + (x / xmax) * 430;
  const sy = (y: number) => 270 - (y / ymax) * 224;
  const path = (pts: Pt[]) => 'M' + pts.map((p) => `${sx(p.x)},${sy(p.y)}`).join('L');
  return (
    <svg
      viewBox="0 0 520 320"
      className={styles.plot}
      role="img"
      aria-label={`Side view: ${speed.toFixed(2)} metres per second at ${angle.toFixed(1)} degrees, target ${distance} inches away`}>
      {[0, 1, 2, 3, 4, 5]
        .filter((x) => x <= xmax)
        .map((x) => (
          <g key={x}>
            <line x1={sx(x)} x2={sx(x)} y1="45" y2="270" stroke="#ffffff0b" />
            <text x={sx(x)} y="291" textAnchor="middle">
              {x}
            </text>
          </g>
        ))}
      <line x1="45" x2="482" y1="270" y2="270" stroke={colors.line} />
      <line x1="45" x2="45" y1="45" y2="270" stroke={colors.line} />
      {[0, 0.5, 1, 1.5, 2]
        .filter((y) => y < ymax)
        .map((y) => (
          <text key={y} x="38" y={sy(y) + 4} textAnchor="end">
            {y}
          </text>
        ))}
      <text x="18" y="25">
        height (m)
      </text>
      <text x="262" y="315" textAnchor="middle">
        horizontal position (m)
      </text>
      <line
        x1="45"
        x2="482"
        y1={sy(H_RIM)}
        y2={sy(H_RIM)}
        stroke={colors.line}
        strokeDasharray="3 5"
      />
      <path
        d={`M${sx(distance * INCH)} ${sy(H_RIM)}V${sy(0.3)}H${sx(distance * INCH + GOAL_DEPTH)}V${sy(H_RIM)}`}
        fill="none"
        stroke={colors.line}
        strokeWidth="3"
      />
      <line
        x1={sx(lo)}
        x2={sx(hi)}
        y1={sy(H_RIM)}
        y2={sy(H_RIM)}
        stroke={colors.target}
        strokeWidth="5"
      />
      {vacuum && (
        <path
          d={path(vac.pts)}
          fill="none"
          stroke={colors.vacuum}
          strokeWidth="2"
          strokeDasharray="6 5"
        />
      )}
      <path d={path(flight.pts)} fill="none" stroke={colors.flight} strokeWidth="3" />
      <rect x={sx(0) - 9} y={sy(H0)} width="18" height={sy(0) - sy(H0)} rx="3" fill="#536789" />
      <text x={sx(0) + 13} y={sy(H0) + 20}>
        launcher
      </text>
      {flight.rimCross !== null && (
        <circle
          cx={sx(flight.rimCross)}
          cy={sy(H_RIM)}
          r="5"
          fill={colors.flight}
          stroke="white"
          strokeWidth="1.5"
        />
      )}
      <text x="490" y="25" textAnchor="end">
        {entersGoal(flight.rimCross, distance * INCH)
          ? 'Inside entry window'
          : 'Outside entry window'}
      </text>
    </svg>
  );
}

interface SearchStep {
  step: number;
  lo: number;
  mid: number;
  hi: number;
  height: number;
  kept: 'left' | 'right';
}

function rimSearch(event: RimEvent, count: number) {
  const dt = 0.02;
  let lo = 0;
  let hi = 1;
  const history: SearchStep[] = [];
  for (let step = 1; step <= count; step++) {
    const mid = (lo + hi) / 2;
    const height = hermitePosition(
      event.before[1],
      event.after[1],
      event.before[3],
      event.after[3],
      dt,
      mid,
    );
    const kept = height > H_RIM ? 'right' : 'left';
    history.push({step, lo, mid, hi, height, kept});
    if (kept === 'right') lo = mid;
    else hi = mid;
  }
  return {lo, hi, history};
}

function RimInset({
  event,
  halvings,
  onHalvings,
}: {
  event: RimEvent | null;
  halvings: number;
  onHalvings: (value: number) => void;
}) {
  if (!event)
    return (
      <p className={styles.note}>
        No descending crossing: this shot does not reach the rim plane from above.
      </p>
    );
  const {before, after} = event;
  const {lo, hi, history} = rimSearch(event, halvings);
  const estimate = (lo + hi) / 2;
  const last = history.at(-1);
  const sx = (t: number) => 48 + t * 414;
  const sampled = Array.from({length: 81}, (_, i) => {
    const t = i / 80;
    return {
      t,
      z: hermitePosition(before[1], after[1], before[3], after[3], 0.02, t),
    };
  });
  const minZ = Math.min(H_RIM, ...sampled.map((p) => p.z));
  const maxZ = Math.max(H_RIM, ...sampled.map((p) => p.z));
  const pad = Math.max(0.002, (maxZ - minZ) * 0.14);
  const sy = (z: number) => 133 - ((z - (minZ - pad)) / (maxZ - minZ + 2 * pad)) * 88;
  const points = sampled.map((p) => `${sx(p.t)},${sy(p.z)}`);
  const bracketMs = 20 / 2 ** halvings;
  const estimateX = hermitePosition(before[0], after[0], before[2], after[2], 0.02, estimate);
  return (
    <div className={styles.hermiteLab}>
      <div className={styles.labHeader}>
        <div>
          <span>Hermite event locator</span>
          <strong>Halve the 20 ms bracket until the rim crossing is isolated</strong>
        </div>
        <b>{halvings} / 16 halvings</b>
      </div>
      <svg
        viewBox="0 0 520 202"
        className={styles.plot}
        role="img"
        aria-label={`Hermite rim crossing search after ${halvings} of 16 binary-search halvings. The remaining time bracket is ${bracketMs.toFixed(5)} milliseconds wide.`}>
        <defs>
          <linearGradient id="search-kept" x1="0" x2="1">
            <stop stopColor={colors.target} stopOpacity="0.08" />
            <stop offset="0.5" stopColor={colors.target} stopOpacity="0.28" />
            <stop offset="1" stopColor={colors.target} stopOpacity="0.08" />
          </linearGradient>
        </defs>
        <text x="26" y="25">
          one RK4 step · height reconstructed between stored states
        </text>
        {halvings > 0 && (
          <>
            <rect
              x="48"
              y="38"
              width={sx(lo) - 48}
              height="106"
              fill={colors.miss}
              opacity="0.08"
            />
            <rect
              x={sx(hi)}
              y="38"
              width={462 - sx(hi)}
              height="106"
              fill={colors.miss}
              opacity="0.08"
            />
          </>
        )}
        <rect
          x={sx(lo)}
          y="38"
          width={Math.max(1.5, sx(hi) - sx(lo))}
          height="106"
          fill="url(#search-kept)"
          stroke={colors.target}
          strokeWidth="1.5"
        />
        <line
          x1="48"
          x2="462"
          y1={sy(H_RIM)}
          y2={sy(H_RIM)}
          stroke={colors.target}
          strokeDasharray="5 4"
        />
        <path d={'M' + points.join('L')} fill="none" stroke={colors.flight} strokeWidth="3" />
        <circle cx="48" cy={sy(before[1])} r="5" fill={colors.vacuum} />
        <circle cx="462" cy={sy(after[1])} r="5" fill={colors.vacuum} />
        {last && (
          <>
            <line
              x1={sx(last.mid)}
              x2={sx(last.mid)}
              y1="38"
              y2="144"
              stroke={colors.vacuum}
              strokeDasharray="3 3"
            />
            <circle
              cx={sx(last.mid)}
              cy={sy(last.height)}
              r="5"
              fill={colors.vacuum}
              stroke="#0b1120"
            />
            <text x={sx(last.mid)} y="160" textAnchor="middle">
              test {last.step}
            </text>
          </>
        )}
        <circle
          cx={sx(estimate)}
          cy={sy(H_RIM)}
          r="6"
          fill={colors.target}
          stroke="#0b1120"
          strokeWidth="2"
        />
        <text x="48" y="184">
          0 ms · above rim
        </text>
        <text x="462" y="184" textAnchor="end">
          20 ms · below rim
        </text>
      </svg>
      <Controls>
        <Slider
          label="Binary-search halvings"
          min={0}
          max={16}
          step={1}
          value={halvings}
          onChange={onHalvings}
          format={(v) => `${v} of 16`}
        />
      </Controls>
      <div className={styles.metrics}>
        <div>
          Remaining time bracket
          <strong>
            {bracketMs < 0.01
              ? `${(bracketMs * 1000).toFixed(2)} µs`
              : `${bracketMs.toFixed(3)} ms`}
          </strong>
        </div>
        <div>
          Current crossing estimate<strong>{estimateX.toFixed(6)} m</strong>
        </div>
        <div>
          Last decision<strong>{last ? `Keep ${last.kept} half` : 'Test midpoint next'}</strong>
        </div>
      </div>
      {history.length > 0 && (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Test</th>
                <th>Midpoint</th>
                <th>Height vs rim</th>
                <th>Keep</th>
              </tr>
            </thead>
            <tbody>
              {history.slice(-4).map((row) => (
                <tr key={row.step} className={row.step === halvings ? styles.selected : undefined}>
                  <td>{row.step}</td>
                  <td>{(row.mid * 20).toFixed(5)} ms</td>
                  <td>{((row.height - H_RIM) * 1000).toFixed(3)} mm</td>
                  <td>{row.kept}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Buttons>
        <Button disabled={halvings === 0} onClick={() => onHalvings(Math.max(0, halvings - 1))}>
          Previous
        </Button>
        <Button
          primary
          disabled={halvings === 16}
          onClick={() => onHalvings(Math.min(16, halvings + 1))}>
          Test midpoint
        </Button>
        <Button onClick={() => onHalvings(16)}>Show final event</Button>
      </Buttons>
    </div>
  );
}
export default function FlightExplorer() {
  const [speed, setSpeed] = useState(5.25),
    [angle, setAngle] = useState(58),
    [cd, setCd] = useState(CD),
    [halvings, setHalvings] = useState(0);
  const flight = useMemo(
    () => simulateDrag({v0: speed, angle: (angle * Math.PI) / 180, dragCoefficient: cd}),
    [speed, angle, cd],
  );
  const vac = simulateVacuum(speed, (angle * Math.PI) / 180);
  const reset = () => {
    setSpeed(5.25);
    setAngle(58);
    setCd(CD);
    setHalvings(0);
  };
  return (
    <Demo title="Follow the ball to the opening" pill="Flight experiment">
      <TrajectoryPlot speed={speed} angle={angle} dragCoefficient={cd} vacuum />
      <Legend
        items={[
          {color: colors.flight, label: 'selected drag coefficient'},
          {color: colors.vacuum, label: 'vacuum (dashed)'},
          {color: colors.target, label: 'center-entry window'},
        ]}
      />
      <Controls>
        <Slider
          label="Exit speed"
          min={4.7}
          max={6.6}
          step={0.025}
          value={speed}
          onChange={setSpeed}
          format={(v) => `${v.toFixed(3)} m/s`}
        />
        <Slider
          label="Launch angle"
          min={42}
          max={58}
          step={0.1}
          value={angle}
          onChange={setAngle}
          format={(v) => `${v.toFixed(1)}°`}
        />
        <Slider
          label="Effective drag coefficient"
          min={0}
          max={0.55}
          step={0.01}
          value={cd}
          onChange={setCd}
          format={(v) => v.toFixed(2)}
        />
      </Controls>
      <div className={styles.metrics}>
        <div>
          Vacuum crossing<strong>{vac.rimCross?.toFixed(3) ?? 'None'} m</strong>
        </div>
        <div>
          Model crossing<strong>{flight.rimCross?.toFixed(3) ?? 'None'} m</strong>
        </div>
        <div>
          Rim flight time<strong>{flight.rimEvent?.time.toFixed(3) ?? 'None'} s</strong>
        </div>
      </div>
      <RimInset event={flight.rimEvent} halvings={halvings} onHalvings={setHalvings} />
      <p className={styles.note}>
        The dot uses the 20 ms solver with Hermite event reconstruction. The main path uses 5 ms
        samples for drawing. Neither the nearest sample nor the later ground impact defines entry.
      </p>
      <Buttons>
        <Button onClick={reset}>Reset paper example</Button>
      </Buttons>
    </Demo>
  );
}
export function IntegratorExperiment() {
  const [dt, setDt] = useState(0.08);
  const options = {v0: 5.25, angle: (58 * Math.PI) / 180};
  const reference = simulateDrag({...options, dt: 0.001}).rimCross!;
  const euler = simulateDrag({...options, dt, method: 'euler'}).rimCross;
  const rk = simulateDrag({...options, dt}).rimCross;
  return (
    <Demo title="A coarse step changes the prediction" pill="Numerical experiment">
      <p className={styles.note}>
        Compare rim-crossing error against a 1 ms RK4 reference. This checks step-size sensitivity
        within one model; the paper also used an independent solver.
      </p>
      <Controls>
        <Slider
          label="Integration time step"
          min={0.005}
          max={0.2}
          step={0.005}
          value={dt}
          onChange={setDt}
          format={(v) => `${(v * 1000).toFixed(0)} ms`}
        />
      </Controls>
      <div className={styles.metrics}>
        <div>
          Euler error
          <strong>
            {euler === null ? 'No event' : `${(Math.abs(euler - reference) * 100).toFixed(2)} cm`}
          </strong>
        </div>
        <div>
          RK4 error
          <strong>
            {rk === null ? 'No event' : `${(Math.abs(rk - reference) * 100).toFixed(4)} cm`}
          </strong>
        </div>
      </div>
      <Buttons>
        <Button onClick={() => setDt(0.08)}>Reset time step</Button>
      </Buttons>
    </Demo>
  );
}
