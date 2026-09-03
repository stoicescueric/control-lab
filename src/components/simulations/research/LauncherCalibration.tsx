import {useState} from 'react';
import {Button, Buttons, Controls, Demo, Legend} from '@site/src/components/kit/Demo';
import {Slider} from '@site/src/components/kit/Slider';
import {
  MEAN_ETA,
  monotoneHermite,
  naturalCubic,
  wheelSurfaceSpeed,
} from '@site/src/lib/domain/projectile';
import {colors} from './ResearchFigures';
import styles from './Research.module.css';

export function TransferExperiment() {
  const [ticks, setTicks] = useState(1500);
  const wheel = wheelSurfaceSpeed(ticks);
  return (
    <Demo title="Follow the units from encoder to ball" pill="Calibration arithmetic">
      <div className={styles.metrics}>
        <div>
          Encoder<strong>{ticks} ticks/s</strong>28 counts / revolution
        </div>
        <div>
          Wheel surface<strong>{wheel.toFixed(2)} m/s</strong>radius 0.0692 m
        </div>
        <div>
          Estimated ball exit<strong>{(MEAN_ETA * wheel).toFixed(2)} m/s</strong>multiply by η =
          0.259
        </div>
      </div>
      <Controls>
        <Slider
          label="Encoder velocity"
          min={1000}
          max={1800}
          step={10}
          value={ticks}
          onChange={setTicks}
          format={(v) => `${v} ticks/s`}
        />
      </Controls>
      <p className={styles.note}>
        This calculation applies the pilot mean to a chosen encoder reading. It is not a fitted
        actuator map or a measured shot at this setting. Angle and wheel contact still require
        calibration.
      </p>
      <Buttons>
        <Button onClick={() => setTicks(1500)}>Reset encoder speed</Button>
      </Buttons>
    </Demo>
  );
}

// The archived season velocity map (Launcher.java, 75db349d).
const DISTANCES = [
  1, 50, 55.2, 58, 60, 63, 66, 69, 76.5, 85.5, 90.3, 95, 100, 110, 120, 130, 135, 140, 145, 150,
  155, 160, 200,
];
const SPEEDS = [
  1320, 1320, 1330, 1360, 1370, 1395, 1400, 1420, 1500, 1550, 1570, 1600, 1700, 1700, 1700, 1850,
  1850, 1900, 1950, 2000, 2040, 2040, 2040,
];
export function CalibrationLookup() {
  const [distance, setDistance] = useState(105);
  const mono = monotoneHermite(DISTANCES, SPEEDS);
  const nat = naturalCubic(DISTANCES, SPEEDS);
  const sx = (d: number) => 55 + ((d - 80) / 50) * 410;
  const sy = (v: number) => 238 - ((v - 1500) / 400) * 180;
  const path = (fn: (v: number) => number) =>
    'M' + Array.from({length: 201}, (_, i) => `${sx(80 + i / 4)},${sy(fn(80 + i / 4))}`).join('L');
  return (
    <Demo title="Read between calibrated distances" pill="Lookup experiment">
      <svg
        viewBox="0 0 520 295"
        className={styles.plot}
        role="img"
        aria-label="Archived flywheel calibration knots with natural and monotone cubic interpolation across a flat shelf">
        <text x="20" y="25">
          flywheel target (ticks/s)
        </text>
        {[1500, 1600, 1700, 1800, 1900].map((v) => (
          <g key={v}>
            <line x1="55" x2="465" y1={sy(v)} y2={sy(v)} stroke="#ffffff0b" />
            <text x="49" y={sy(v) + 4} textAnchor="end">
              {v}
            </text>
          </g>
        ))}
        {[80, 90, 100, 110, 120, 130].map((d) => (
          <text key={d} x={sx(d)} y="263" textAnchor="middle">
            {d}
          </text>
        ))}
        <text x="260" y="288" textAnchor="middle">
          distance (inches)
        </text>
        <path
          d={path(nat)}
          fill="none"
          stroke={colors.miss}
          strokeWidth="2"
          strokeDasharray="6 5"
        />
        <path d={path(mono.evaluate)} fill="none" stroke={colors.flight} strokeWidth="3" />
        {DISTANCES.map(
          (d, i) =>
            d >= 80 &&
            d <= 130 && <circle key={d} cx={sx(d)} cy={sy(SPEEDS[i])} r="4" fill="white" />,
        )}
        <line
          x1={sx(distance)}
          x2={sx(distance)}
          y1="238"
          y2={sy(mono.evaluate(distance))}
          stroke={colors.target}
          strokeDasharray="4 4"
        />
        <circle cx={sx(distance)} cy={sy(mono.evaluate(distance))} r="6" fill={colors.target} />
      </svg>
      <Legend
        items={[
          {color: 'white', label: 'archived calibration knots'},
          {color: colors.flight, label: 'monotone Hermite'},
          {color: colors.miss, label: 'natural spline (dashed)'},
        ]}
      />
      <Controls>
        <Slider
          label="Lookup distance"
          min={80}
          max={130}
          step={0.5}
          value={distance}
          onChange={setDistance}
          format={(v) => `${v.toFixed(1)} in`}
        />
      </Controls>
      <div className={styles.metrics}>
        <div>
          Monotone command<strong>{mono.evaluate(distance).toFixed(1)}</strong>ticks/s
        </div>
        <div>
          Natural command<strong>{nat(distance).toFixed(1)}</strong>ticks/s
        </div>
      </div>
      <p className={styles.note}>
        This is a cropped portion of the deployed map. The natural spline is a comparison through
        these same knots. The shelf should stay at 1,700 ticks/s between 100 and 120 inches.
      </p>
      <Buttons>
        <Button onClick={() => setDistance(105)}>Reset shelf query</Button>
      </Buttons>
    </Demo>
  );
}
