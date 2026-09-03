import {useMemo, useState} from 'react';
import {Button, Buttons, Controls, Demo, Legend} from '@site/src/components/kit/Demo';
import {Slider} from '@site/src/components/kit/Slider';
import {
  H0,
  MEAN_ETA,
  backtrackRelease,
  fitReleaseFromPositions,
  integrateStateFor,
  wheelSurfaceSpeed,
  type State,
  type TimedPosition,
} from '@site/src/lib/domain/projectile';
import {colors} from './ResearchFigures';
import styles from './Research.module.css';

const ENCODER_TICKS = 1500;
const TRUE_ANGLE = 52;
const METRES_PER_PIXEL = 0.0008;

function cameraNoise(frame: number, axis: number): number {
  return 0.62 * Math.sin(frame * 7.17 + axis * 2.4) + 0.38 * Math.sin(frame * 2.31 + axis * 5.8);
}

function trackedFrames(fps: number, noisePx: number, count = 23): TimedPosition[] {
  const dt = 1 / fps;
  const speed = MEAN_ETA * wheelSurfaceSpeed(ENCODER_TICKS);
  const angle = (TRUE_ANGLE * Math.PI) / 180;
  let state: State = [0, H0, speed * Math.cos(angle), speed * Math.sin(angle)];
  return Array.from({length: count}, (_, index) => {
    const frame = index + 1;
    state = integrateStateFor(state, dt, Math.min(0.001, dt));
    return {
      time: frame * dt,
      x: state[0] + noisePx * METRES_PER_PIXEL * cameraNoise(frame, 0),
      z: state[1] + noisePx * METRES_PER_PIXEL * cameraNoise(frame, 1),
    };
  });
}

export default function TransferEstimation() {
  const [fps, setFps] = useState(240);
  const [noisePx, setNoisePx] = useState(0.35);
  const [frameNumber, setFrameNumber] = useState(12);
  const wheel = wheelSurfaceSpeed(ENCODER_TICKS);
  const frames = useMemo(() => trackedFrames(fps, noisePx), [fps, noisePx]);
  const backward = useMemo(
    () => backtrackRelease(frames[frameNumber - 2], frames[frameNumber - 1], frames[frameNumber]),
    [frames, frameNumber],
  );
  const forward = useMemo(
    () =>
      fitReleaseFromPositions(frames.slice(0, 18), {
        speedMin: 5,
        speedMax: 7,
        angleMinDeg: 45,
        angleMaxDeg: 60,
      }),
    [frames],
  );
  const backwardEta = backward.speed / wheel;
  const forwardEta = forward.speed / wheel;
  const selected = frames[frameNumber - 1];
  const reconstructed = useMemo(() => {
    const points: TimedPosition[] = [];
    const samples = 36;
    for (let i = 0; i <= samples; i++) {
      const time = (selected.time * i) / samples;
      const state = integrateStateFor(backward.state, time, 0.00075);
      points.push({time, x: state[0], z: state[1]});
    }
    return points;
  }, [backward, selected.time]);
  const xmax = Math.max(...frames.map((frame) => frame.x)) * 1.08;
  const zmin = H0 - 0.055;
  const zmax = Math.max(...frames.map((frame) => frame.z)) + 0.055;
  const sx = (x: number) => 52 + (x / xmax) * 422;
  const sy = (z: number) => 250 - ((z - zmin) / (zmax - zmin)) * 192;
  const path = 'M' + reconstructed.map((point) => `${sx(point.x)},${sy(point.z)}`).join('L');

  const reset = () => {
    setFps(240);
    setNoisePx(0.35);
    setFrameNumber(12);
  };

  return (
    <Demo title="Recover exit speed from high-speed video" pill="Inverse calibration experiment">
      <div className={styles.methodRail} aria-label="Transfer estimation pipeline">
        <div>
          <span>01</span>
          <strong>Synchronize</strong>
          <small>camera frames + encoder log</small>
        </div>
        <div>
          <span>02</span>
          <strong>Calibrate pixels</strong>
          <small>world position + timestamps</small>
        </div>
        <div>
          <span>03</span>
          <strong>Estimate release</strong>
          <small>backward step or forward fit</small>
        </div>
        <div>
          <span>04</span>
          <strong>Divide speeds</strong>
          <small>η = v exit / v wheel</small>
        </div>
      </div>
      <svg
        viewBox="0 0 520 306"
        className={styles.plot}
        role="img"
        aria-label={`First ${frames.length} tracked positions at ${fps} frames per second. Frame ${frameNumber} seeds a backward RK4 reconstruction to the release plane.`}>
        <defs>
          <marker
            id="backward-arrow"
            markerWidth="8"
            markerHeight="8"
            refX="4"
            refY="4"
            orient="auto">
            <path d="M8 1L1 4L8 7" fill="none" stroke={colors.target} strokeWidth="1.5" />
          </marker>
        </defs>
        <text x="23" y="26">
          early flight · calibrated camera plane
        </text>
        <line x1={sx(0)} x2={sx(0)} y1="42" y2="257" stroke={colors.line} strokeDasharray="4 4" />
        <line x1="52" x2="474" y1={sy(H0)} y2={sy(H0)} stroke="#ffffff12" />
        <text x="466" y={sy(H0) - 9} textAnchor="end">
          known release height
        </text>
        <path d={path} fill="none" stroke={colors.flight} strokeWidth="2.5" strokeDasharray="5 4" />
        {frames.map((frame, index) => (
          <circle
            key={frame.time}
            cx={sx(frame.x)}
            cy={sy(frame.z)}
            r={index + 1 === frameNumber ? 6 : 3}
            fill={index + 1 === frameNumber ? colors.target : colors.good}
            opacity={index + 1 > frameNumber + 1 ? 0.45 : 1}
          />
        ))}
        <circle
          cx={sx(backward.state[0])}
          cy={sy(backward.state[1])}
          r="6"
          fill={colors.flight}
          stroke="white"
        />
        <line
          x1={sx(selected.x)}
          y1={sy(selected.z)}
          x2={sx(reconstructed[Math.floor(reconstructed.length * 0.55)].x)}
          y2={sy(reconstructed[Math.floor(reconstructed.length * 0.55)].z)}
          stroke={colors.target}
          strokeWidth="2"
          markerEnd="url(#backward-arrow)"
        />
        <text x={sx(selected.x)} y={sy(selected.z) - 14} textAnchor="middle">
          frame {frameNumber}
        </text>
        <text x={sx(backward.state[0]) + 10} y={sy(backward.state[1]) + 22}>
          reconstructed release
        </text>
        <text x="260" y="290" textAnchor="middle">
          horizontal position (early post-release frames)
        </text>
      </svg>
      <Legend
        items={[
          {color: colors.good, label: 'tracked centers'},
          {color: colors.target, label: 'state used for backward integration'},
          {color: colors.flight, label: 'backward reconstruction'},
        ]}
      />
      <Controls>
        <Slider
          label="Camera frame rate"
          min={120}
          max={960}
          step={120}
          value={fps}
          onChange={setFps}
          format={(v) => `${v} fps · ${(1000 / v).toFixed(2)} ms/frame`}
        />
        <Slider
          label="Position noise"
          min={0}
          max={2}
          step={0.05}
          value={noisePx}
          onChange={setNoisePx}
          format={(v) => `±${v.toFixed(2)} px`}
        />
        <Slider
          label="Frame used to backtrack"
          min={3}
          max={20}
          step={1}
          value={frameNumber}
          onChange={setFrameNumber}
          format={(v) => `frame ${v} · ${((v / fps) * 1000).toFixed(1)} ms`}
        />
      </Controls>
      <div className={styles.metrics}>
        <div>
          Teaching reference<strong>{MEAN_ETA.toFixed(3)}</strong>η used to generate frames
        </div>
        <div>
          Three-frame backward estimate<strong>{backwardEta.toFixed(3)}</strong>
          {backward.speed.toFixed(2)} m/s · {backward.angleDeg.toFixed(1)}°
        </div>
        <div>
          Multi-frame forward fit<strong>{forwardEta.toFixed(3)}</strong>
          {forward.speed.toFixed(2)} m/s · {forward.angleDeg.toFixed(1)}°
        </div>
        <div>
          Forward-fit residual<strong>{(forward.rmse * 1000).toFixed(2)} mm</strong>18 tracked
          positions
        </div>
      </div>
      <p className={styles.note}>
        The backward estimate takes a centered-difference velocity at the selected frame and runs
        the same drag ODE toward release with a negative time step. The forward fit searches release
        speed and angle, integrates every candidate forward, and minimizes position error across 18
        frames. These are synthetic teaching data; they are not additional measurements from the
        paper.
      </p>
      <Buttons>
        <Button
          onClick={() => {
            setFps(480);
            setNoisePx(0);
            setFrameNumber(12);
          }}>
          Clean 480 fps
        </Button>
        <Button
          onClick={() => {
            setFps(240);
            setNoisePx(1.25);
            setFrameNumber(12);
          }}>
          Noisy 240 fps
        </Button>
        <Button onClick={reset}>Reset experiment</Button>
      </Buttons>
    </Demo>
  );
}
