import {useEffect, useMemo, useState} from 'react';
import {Button, Buttons, Controls, Demo, Legend} from '@site/src/components/kit/Demo';
import {Slider} from '@site/src/components/kit/Slider';
import {
  ANGLE_COUNT,
  ANGLE_RADIUS,
  ANGLE_MIN,
  ANGLE_STEP,
  SPEED_COUNT,
  SPEED_RADIUS,
  SPEED_MIN,
  SPEED_STEP,
  selectLaunch,
  type LaunchCandidate,
} from '@site/src/lib/domain/launchSelection';
import {INCH, simulateDrag} from '@site/src/lib/domain/projectile';
import {TrajectoryPlot} from './FlightExplorer';
import {colors} from './ResearchFigures';
import ShotFamily3D from './ShotFamily3D';
import styles from './Research.module.css';

let cachedEvents: Float64Array | null = null;
export default function RobustSelection() {
  const [events, setEvents] = useState<Float64Array | null>(cachedEvents);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [distance, setDistance] = useState(70);
  const [choice, setChoice] = useState<'best' | 'baseline' | number>('best');
  const [heatmap, setHeatmap] = useState('');
  useEffect(() => {
    if (cachedEvents) {
      setEvents(cachedEvents);
      return;
    }
    let worker: Worker;
    try {
      worker = new Worker(new URL('./launchSelection.worker.ts', import.meta.url));
      worker.onmessage = (e: MessageEvent<{events?: Float64Array; error?: string}>) => {
        if (e.data.events) {
          cachedEvents = e.data.events;
          setEvents(e.data.events);
          setError('');
        } else setError(e.data.error ?? 'Could not calculate the map.');
        worker.terminate();
      };
      worker.onerror = () => {
        setError('Could not calculate the map. Retry to start a new calculation.');
        worker.terminate();
      };
      worker.postMessage('build');
    } catch {
      setError('The browser could not start the calculation worker.');
      return;
    }
    return () => worker.terminate();
  }, [attempt]);
  const selection = useMemo(
    () => (events ? selectLaunch(events, distance * INCH) : null),
    [events, distance],
  );
  const candidate: LaunchCandidate | null = selection
    ? choice === 'best'
      ? selection.best
      : choice === 'baseline'
        ? selection.baseline
        : (selection.candidates[choice] ?? selection.best)
    : null;
  const candidateFlight = useMemo(
    () =>
      candidate
        ? simulateDrag({v0: candidate.speed, angle: (candidate.angle * Math.PI) / 180})
        : null,
    [candidate],
  );
  const inspectIndices = useMemo(() => {
    if (!selection?.candidates.length) return [];
    const stride = Math.max(1, Math.ceil(selection.candidates.length / 80));
    const indices = new Set<number>();
    for (let i = 0; i < selection.candidates.length; i += stride) indices.add(i);
    indices.add(selection.candidates.length - 1);
    if (selection.best) indices.add(selection.candidates.indexOf(selection.best));
    if (selection.baseline) indices.add(selection.candidates.indexOf(selection.baseline));
    if (candidate) indices.add(selection.candidates.indexOf(candidate));
    return [...indices].filter((i) => i >= 0).sort((a, b) => a - b);
  }, [selection, candidate]);
  useEffect(() => {
    if (!selection) return;
    const canvas = document.createElement('canvas');
    canvas.width = ANGLE_COUNT;
    canvas.height = SPEED_COUNT;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#152237';
    ctx.fillRect(0, 0, ANGLE_COUNT, SPEED_COUNT);
    for (let row = 0; row < SPEED_COUNT; row++)
      for (let col = 0; col < ANGLE_COUNT; col++) {
        if (selection.made[row * ANGLE_COUNT + col]) {
          ctx.fillStyle = '#536e91';
          ctx.fillRect(col, SPEED_COUNT - 1 - row, 1, 1);
        }
      }
    for (const c of selection.candidates) {
      ctx.fillStyle = `rgb(${Math.round(56 + c.coverage * 110)}, ${Math.round(96 + c.coverage * 280)}, ${Math.round(150 + c.coverage * 280)})`;
      ctx.fillRect(c.col, SPEED_COUNT - 1 - c.row, 1, 1);
    }
    setHeatmap(canvas.toDataURL());
  }, [selection]);
  const x = (col: number) => 60 + ((col + 0.5) / ANGLE_COUNT) * 390;
  const y = (row: number) => 280 - ((row + 0.5) / SPEED_COUNT) * 230;
  function selectAt(angle: number, speed: number) {
    if (!selection?.candidates.length) return;
    let nearest = 0,
      score = Infinity;
    selection.candidates.forEach((c, i) => {
      const delta = ((c.angle - angle) / 19) ** 2 + ((c.speed - speed) / 3.3) ** 2;
      if (delta < score) {
        score = delta;
        nearest = i;
      }
    });
    setChoice(nearest);
  }
  return (
    <Demo title="Which scoring command has more room for error?" pill="Selection experiment">
      {!events && !error && (
        <p role="status" className={styles.note}>
          Calculating the 25,403 trajectories once. Target changes will reuse this map.
        </p>
      )}
      {error && (
        <div role="alert">
          <p>{error}</p>
          <Button
            onClick={() => {
              setError('');
              setAttempt((v) => v + 1);
            }}>
            Retry calculation
          </Button>
        </div>
      )}
      {candidate && (
        <>
          <div className={styles.simulatorBar}>
            <div className={styles.simulatorBrand}>
              <span>◢◤</span>
              <div>
                <strong>SHOT FAMILY WORKBENCH</strong>
                <small>RK4 · Hermite event · quadratic drag</small>
              </div>
            </div>
            <div className={styles.simulatorStatus}>
              <i />
              LIVE MODEL
            </div>
          </div>
          <div className={styles.readoutStrip}>
            <div>
              <span>APEX</span>
              <strong>{candidateFlight?.peak.toFixed(2)} m</strong>
            </div>
            <div>
              <span>RIM TIME</span>
              <strong>{candidateFlight?.rimEvent?.time.toFixed(3) ?? '—'} s</strong>
            </div>
            <div>
              <span>RIM X</span>
              <strong>{candidateFlight?.rimCross?.toFixed(3) ?? '—'} m</strong>
            </div>
            <div>
              <span>COVERAGE</span>
              <strong>{(candidate.coverage * 100).toFixed(1)}%</strong>
            </div>
            <div className={styles.scoreReadout}>
              <span>NOMINAL</span>
              <strong>✓ ENTRY</strong>
            </div>
          </div>
          <ShotFamily3D
            candidate={candidate}
            candidates={selection!.candidates}
            distance={distance}
          />
          <div className={styles.labHeader}>
            <div>
              <span>Simulator view 02 · tolerance map</span>
              <strong>Move the stress box through command space</strong>
            </div>
            <b>{selection!.candidates.length} nominal entries</b>
          </div>
          <svg
            viewBox="0 0 520 332"
            className={styles.plot}
            role="img"
            aria-label="Speed-angle entry map. Bright scoring commands have greater coverage. Gold rectangle shows all tested perturbations."
            onClick={(e) => {
              const r = e.currentTarget.getBoundingClientRect();
              const px = ((e.clientX - r.left) * 520) / r.width,
                py = ((e.clientY - r.top) * 332) / r.height;
              if (px >= 60 && px <= 450 && py >= 50 && py <= 280)
                selectAt(
                  ANGLE_MIN + ((px - 60) / 390) * ANGLE_COUNT * ANGLE_STEP,
                  SPEED_MIN + ((280 - py) / 230) * SPEED_COUNT * SPEED_STEP,
                );
            }}>
            <text x="22" y="24">
              exit speed (m/s)
            </text>
            {heatmap && (
              <image
                href={heatmap}
                x="60"
                y="50"
                width="390"
                height="230"
                preserveAspectRatio="none"
                style={{imageRendering: 'pixelated'}}
              />
            )}
            {[4, 5, 6, 7].map((v) => (
              <text key={v} x="50" y={y((v - SPEED_MIN) / SPEED_STEP) + 4} textAnchor="end">
                {v}
              </text>
            ))}
            {[42, 46, 50, 54, 58].map((a) => (
              <text key={a} x={x((a - ANGLE_MIN) / ANGLE_STEP)} y="301" textAnchor="middle">
                {a}°
              </text>
            ))}
            <text x="260" y="325" textAnchor="middle">
              launch angle (degrees)
            </text>
            <rect
              x={x(ANGLE_RADIUS)}
              y={y((6.61 - SPEED_MIN) / SPEED_STEP)}
              width={x(175) - x(ANGLE_RADIUS)}
              height={y(SPEED_RADIUS) - y((6.61 - SPEED_MIN) / SPEED_STEP)}
              stroke={colors.vacuum}
              fill="none"
              strokeDasharray="4 4"
            />
            <rect
              x={x(candidate.col - ANGLE_RADIUS)}
              y={y(candidate.row + SPEED_RADIUS)}
              width={x(candidate.col + ANGLE_RADIUS) - x(candidate.col - ANGLE_RADIUS)}
              height={y(candidate.row - SPEED_RADIUS) - y(candidate.row + SPEED_RADIUS)}
              stroke={colors.target}
              strokeWidth="2"
              fill="#ffc66d12"
            />
            <circle
              cx={x(candidate.col)}
              cy={y(candidate.row)}
              r="5"
              fill={colors.target}
              stroke="#0b1120"
              strokeWidth="2"
            />
          </svg>
          <Legend
            items={[
              {color: '#152237', label: 'miss / no rim event'},
              {color: '#536e91', label: 'entry outside command envelope'},
              {color: colors.flight, label: 'brighter = more coverage'},
              {color: colors.target, label: 'selected perturbation box'},
            ]}
          />
          <div className={styles.metrics}>
            <div>
              Selected command<strong>{candidate.speed.toFixed(3)} m/s</strong>
              {candidate.angle.toFixed(1)}° launch angle
            </div>
            <div>
              Successful perturbations
              <strong>
                {candidate.made} / {candidate.total}
              </strong>
              ±0.7 m/s, ±1.5°
            </div>
            <div>
              Coverage<strong>{candidate.coverage.toFixed(3)}</strong>stress-test fraction
            </div>
          </div>
          <Buttons>
            <Button active={choice === 'best'} onClick={() => setChoice('best')}>
              Most tolerant shot
            </Button>
            <Button active={choice === 'baseline'} onClick={() => setChoice('baseline')}>
              Fragile scoring shot
            </Button>
          </Buttons>
          <p className={styles.note}>
            Click the map to inspect the nearest nominal scoring command, or use the
            keyboard-accessible list. The dashed outline is the measured command envelope.
            Perturbations may extend beyond it.
          </p>
          <label className={styles.note}>
            Inspect a representative scoring command ({inspectIndices.length} of{' '}
            {selection!.candidates.length})
            <select
              className={styles.select}
              value={selection!.candidates.indexOf(candidate)}
              onChange={(e) => setChoice(Number(e.target.value))}>
              {inspectIndices.map((i) => {
                const c = selection!.candidates[i];
                return (
                  <option key={i} value={i}>
                    {c.speed.toFixed(3)} m/s · {c.angle.toFixed(1)}° · {c.made}/{c.total}
                  </option>
                );
              })}
            </select>
          </label>
          <div className={styles.labHeader}>
            <div>
              <span>Simulator view 01 · side plane</span>
              <strong>Inspect the selected nominal trajectory</strong>
            </div>
            <b>
              {candidate.speed.toFixed(3)} m/s · {candidate.angle.toFixed(1)}°
            </b>
          </div>
          <div>
            <TrajectoryPlot speed={candidate.speed} angle={candidate.angle} distance={distance} />
          </div>
        </>
      )}
      {selection && !candidate && (
        <p role="status">No nominal scoring command exists at this distance.</p>
      )}
      <Controls>
        <Slider
          label="Distance to front lip"
          min={60}
          max={105}
          step={1}
          value={distance}
          onChange={(v) => {
            setDistance(v);
            setChoice('best');
          }}
          format={(v) => `${v} in · ${(v * INCH).toFixed(3)} m`}
        />
      </Controls>
      <Buttons>
        <Button
          onClick={() => {
            setDistance(70);
            setChoice('best');
          }}>
          Reset 70-inch example
        </Button>
      </Buttons>
      <p className={styles.note}>
        Coverage ranks commands over a uniformly weighted stress box. It is not a predicted physical
        success probability.
      </p>
    </Demo>
  );
}
