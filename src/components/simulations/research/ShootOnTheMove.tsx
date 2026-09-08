import {useMemo, useState} from 'react';
import {Button, Buttons, Controls, Demo, Legend} from '@site/src/components/kit/Demo';
import {Slider} from '@site/src/components/kit/Slider';
import {INCH} from '@site/src/lib/domain/projectile';
import {solveMovingAim, type Vec2} from '@site/src/lib/domain/movingAim';
import {colors} from './ResearchFigures';
import styles from './Research.module.css';

type MotionPreset = 'stationary' | 'sideways' | 'approaching' | 'retreating';

function velocityFor(preset: MotionPreset, speed: number): Vec2 {
  if (preset === 'sideways') return {x: 0, y: speed};
  if (preset === 'approaching') return {x: speed, y: 0};
  if (preset === 'retreating') return {x: -speed, y: 0};
  return {x: 0, y: 0};
}

export default function ShootOnTheMove() {
  const [distanceIn, setDistanceIn] = useState(95);
  const [speed, setSpeed] = useState(1.5);
  const [preset, setPreset] = useState<MotionPreset>('sideways');
  const [requestedStep, setRequestedStep] = useState(0);
  const velocity = velocityFor(preset, speed);
  const result = useMemo(
    () =>
      solveMovingAim({
        shooter: {x: 0, y: 0},
        target: {x: distanceIn * INCH, y: 0},
        robotVelocity: velocityFor(preset, speed),
      }),
    [distanceIn, preset, speed],
  );
  const step = Math.min(requestedStep, result.iterations.length - 1);
  const selected = result.iterations[step];
  const scaleX = 105;
  const scaleY = 82;
  const sx = (x: number) => 100 + x * scaleX;
  const sy = (y: number) => 150 - y * scaleY;
  const target = {x: distanceIn * INCH, y: 0};
  const velocityLength = Math.hypot(velocity.x, velocity.y);
  const velocityTip = {
    x: 100 + velocity.x * 52,
    y: 150 - velocity.y * 52,
  };
  const correction = Math.hypot(selected.correctionM.x, selected.correctionM.y);
  const totalTime = 0.05 + selected.timeUsedS;
  const contractionRate =
    result.iterations.length >= 3 &&
    result.iterations[result.iterations.length - 2].incrementS > 1e-9
      ? result.iterations[result.iterations.length - 1].incrementS /
        result.iterations[result.iterations.length - 2].incrementS
      : null;
  const finalResidual = result.iterations[result.iterations.length - 1].incrementS;

  const choosePreset = (next: MotionPreset, nextSpeed = speed) => {
    setPreset(next);
    setSpeed(next === 'stationary' ? 0 : nextSpeed || 1.5);
    setRequestedStep(0);
  };

  return (
    <Demo title="Aim at the target the ball needs" pill="Moving-shot experiment">
      <svg
        viewBox="0 0 520 315"
        className={styles.plot}
        role="img"
        aria-label={`Top-down field view. The robot moves ${preset} at ${velocityLength.toFixed(1)} metres per second. Update ${step + 1} places the virtual target ${correction.toFixed(2)} metres from the real target.`}>
        <defs>
          <marker
            id="motion-velocity-arrow"
            markerWidth="8"
            markerHeight="8"
            refX="7"
            refY="4"
            orient="auto">
            <path d="M0 0L8 4L0 8Z" fill={colors.target} />
          </marker>
          <marker
            id="motion-aim-arrow"
            markerWidth="8"
            markerHeight="8"
            refX="7"
            refY="4"
            orient="auto">
            <path d="M0 0L8 4L0 8Z" fill={colors.flight} />
          </marker>
        </defs>
        <text x="22" y="27">
          top view · update {step + 1} of {result.iterations.length}
        </text>
        <path d="M42 58H486V276H42Z" fill="#0e1728" stroke={colors.line} />
        <path d="M100 66V267M205 66V267M310 66V267M415 66V267" stroke="#ffffff0a" />
        <line
          x1={sx(0)}
          y1={sy(0)}
          x2={sx(target.x)}
          y2={sy(target.y)}
          stroke={colors.vacuum}
          strokeDasharray="6 5"
          strokeWidth="2"
        />
        <line
          x1={sx(0)}
          y1={sy(0)}
          x2={sx(selected.virtualTarget.x)}
          y2={sy(selected.virtualTarget.y)}
          stroke={colors.flight}
          strokeWidth="3"
          markerEnd="url(#motion-aim-arrow)"
        />
        <rect
          x="78"
          y="132"
          width="44"
          height="36"
          rx="7"
          fill="#243554"
          stroke={colors.flight}
          strokeWidth="2"
        />
        <circle cx="100" cy="150" r="4" fill="white" />
        <text x="100" y="190" textAnchor="middle">
          robot
        </text>
        {velocityLength > 0 && (
          <line
            x1="100"
            y1="150"
            x2={velocityTip.x}
            y2={velocityTip.y}
            stroke={colors.target}
            strokeWidth="4"
            markerEnd="url(#motion-velocity-arrow)"
          />
        )}
        <circle
          cx={sx(target.x)}
          cy={sy(target.y)}
          r="14"
          fill="#69d8ba22"
          stroke={colors.good}
          strokeWidth="3"
        />
        <circle cx={sx(target.x)} cy={sy(target.y)} r="4" fill={colors.good} />
        <text x={sx(target.x)} y={sy(target.y) - 22} textAnchor="middle">
          real target
        </text>
        <circle
          cx={sx(selected.virtualTarget.x)}
          cy={sy(selected.virtualTarget.y)}
          r="8"
          fill={colors.flight}
          stroke="white"
          strokeWidth="1.5"
        />
        <text
          x={sx(selected.virtualTarget.x)}
          y={sy(selected.virtualTarget.y) + (selected.virtualTarget.y > 0 ? -14 : 23)}
          textAnchor="middle">
          virtual target
        </text>
        <text x="260" y="300" textAnchor="middle">
          field position in the horizontal plane
        </text>
      </svg>
      <Legend
        items={[
          {color: colors.good, label: 'real target'},
          {color: colors.flight, label: 'virtual aim point'},
          {color: colors.target, label: 'robot velocity'},
        ]}
      />

      <div className={styles.timeline} aria-label="Release-delay and flight-time timeline">
        <div style={{flex: 0.05}}>
          <strong>50 ms</strong>
          feeder delay
        </div>
        <div style={{flex: selected.timeUsedS}}>
          <strong>{selected.timeUsedS.toFixed(3)} s</strong>
          rim flight time
        </div>
        <span>{totalTime.toFixed(3)} s from command to rim</span>
      </div>

      <Controls>
        <Slider
          label="Real-target distance"
          min={60}
          max={116}
          step={1}
          value={distanceIn}
          onChange={(value) => {
            setDistanceIn(value);
            setRequestedStep(0);
          }}
          format={(value) => `${value} in · ${(value * INCH).toFixed(2)} m`}
        />
        <Slider
          label="Robot speed"
          min={0}
          max={1.7}
          step={0.1}
          value={speed}
          onChange={(value) => {
            setSpeed(value);
            if (preset === 'stationary' && value > 0) setPreset('sideways');
            setRequestedStep(0);
          }}
          format={(value) => `${value.toFixed(1)} m/s`}
        />
      </Controls>
      <Buttons>
        <Button onClick={() => choosePreset('stationary', 0)}>Stationary</Button>
        <Button onClick={() => choosePreset('sideways', 1.5)}>Sideways</Button>
        <Button onClick={() => choosePreset('approaching', 1.5)}>Approaching</Button>
        <Button onClick={() => choosePreset('retreating', 1.5)}>Retreating</Button>
      </Buttons>

      <div className={styles.metrics}>
        <div>
          Initial real-target time<strong>{result.initialTimeS.toFixed(3)} s</strong>from the
          archived map
        </div>
        <div>
          Virtual-target shift<strong>{correction.toFixed(3)} m</strong>opposite inherited velocity
        </div>
        <div>
          Virtual distance<strong>{selected.virtualDistanceM.toFixed(3)} m</strong>
          {(selected.virtualDistanceM / INCH).toFixed(1)} inches
        </div>
        <div>
          Solver status<strong>{result.converged ? 'Converged' : 'Update cap'}</strong>
          {result.iterations.length} of 5 updates
        </div>
        <div>
          Final time residual<strong>{finalResidual.toFixed(3)} s</strong>
          {finalResidual <= 0.05 ? 'inside' : 'outside'} the archived tolerance
        </div>
        <div>
          Local contraction
          <strong>
            {contractionRate === null ? 'Need 3 updates' : contractionRate.toFixed(3)}
          </strong>
          {contractionRate === null ? 'no reliable ratio yet' : 'last increment ratio'}
        </div>
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Update</th>
              <th>time used</th>
              <th>virtual distance</th>
              <th>next time</th>
              <th>|Δt|</th>
            </tr>
          </thead>
          <tbody>
            {result.iterations.map((iteration, index) => (
              <tr key={iteration.update} className={index === step ? styles.selected : undefined}>
                <td>{iteration.update}</td>
                <td>{iteration.timeUsedS.toFixed(3)} s</td>
                <td>
                  {(iteration.virtualDistanceM / INCH).toFixed(1)} in
                  {iteration.clamped ? ' (clamped)' : ''}
                </td>
                <td>{iteration.nextTimeS.toFixed(3)} s</td>
                <td>{iteration.incrementS.toFixed(3)} s</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Buttons>
        <Button onClick={() => setRequestedStep(Math.max(0, step - 1))}>Previous update</Button>
        <Button onClick={() => setRequestedStep(Math.min(result.iterations.length - 1, step + 1))}>
          Next update
        </Button>
        <Button
          onClick={() => {
            setDistanceIn(95);
            setSpeed(1.5);
            setPreset('sideways');
            setRequestedStep(0);
          }}>
          Reset example
        </Button>
      </Buttons>
      <p className={styles.note}>
        The archived solver assumes constant chassis velocity over the feeder delay and flight. Its
        acceleration term was disabled. A clamped time lookup can still return a number, but the
        status warns that the virtual distance is outside the calibrated map.
      </p>
    </Demo>
  );
}
