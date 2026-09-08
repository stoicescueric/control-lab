import {useState} from 'react';
import {Button, Buttons, Controls, Demo, Legend} from '@site/src/components/kit/Demo';
import {Slider} from '@site/src/components/kit/Slider';
import {calibrationShotBudget} from '@site/src/lib/domain/calibrationStrategy';
import {colors} from './ResearchFigures';
import styles from './Research.module.css';

export default function StrategyComparison() {
  const [stations, setStations] = useState(15);
  const [modelPairs, setModelPairs] = useState(3);
  const [empiricalPairs, setEmpiricalPairs] = useState(9);
  const [repeats, setRepeats] = useState(5);
  const [validation, setValidation] = useState(5);
  const model = calibrationShotBudget({
    distanceStations: stations,
    candidatePairsPerStation: modelPairs,
    repeatsPerPair: repeats,
    heldOutShotsPerStation: validation,
    setupShots: 7,
  });
  const empirical = calibrationShotBudget({
    distanceStations: stations,
    candidatePairsPerStation: empiricalPairs,
    repeatsPerPair: repeats,
    heldOutShotsPerStation: validation,
  });
  const maxShots = Math.max(model.totalShots, empirical.totalShots, 1);
  const bar = (shots: number) => 360 * (shots / maxShots);

  const reset = () => {
    setStations(15);
    setModelPairs(3);
    setEmpiricalPairs(9);
    setRepeats(5);
    setValidation(5);
  };

  return (
    <Demo title="Plan the calibration campaign before firing" pill="Method comparison">
      <div className={styles.strategyGrid}>
        <section>
          <span>MODEL-GUIDED</span>
          <strong>Physics narrows the search</strong>
          <ol>
            <li>simulate scoring speed-angle commands</li>
            <li>rank each command's perturbation box</li>
            <li>test a local set of wheel-hood corrections</li>
            <li>store the final two actuator LUTs</li>
          </ol>
        </section>
        <section>
          <span>EMPIRICAL TWO-LUT</span>
          <strong>The field test supplies the search</strong>
          <ol>
            <li>choose a grid of target distances</li>
            <li>sweep candidate wheel-hood pairs</li>
            <li>repeat and rank physical outcomes</li>
            <li>store wheel and hood versus distance</li>
          </ol>
        </section>
      </div>

      <svg
        viewBox="0 0 520 220"
        className={styles.plot}
        role="img"
        aria-label={`Teaching shot-budget comparison: ${model.totalShots} model-guided launches and ${empirical.totalShots} empirical two-table launches under the selected assumptions.`}>
        <text x="24" y="28">
          physical launches in this teaching plan
        </text>
        <text x="24" y="77">
          model-guided
        </text>
        <rect x="132" y="56" width="360" height="27" rx="5" fill="#ffffff10" />
        <rect
          x="132"
          y="56"
          width={bar(model.totalShots)}
          height="27"
          rx="5"
          fill={colors.flight}
        />
        <text
          x={Math.min(482, 142 + bar(model.totalShots))}
          y="75"
          textAnchor={bar(model.totalShots) > 320 ? 'end' : 'start'}
          fill="white">
          {model.totalShots}
        </text>
        <text x="24" y="132">
          empirical LUT
        </text>
        <rect x="132" y="111" width="360" height="27" rx="5" fill="#ffffff10" />
        <rect
          x="132"
          y="111"
          width={bar(empirical.totalShots)}
          height="27"
          rx="5"
          fill={colors.target}
        />
        <text
          x={Math.min(482, 142 + bar(empirical.totalShots))}
          y="130"
          textAnchor={bar(empirical.totalShots) > 320 ? 'end' : 'start'}
          fill="white">
          {empirical.totalShots}
        </text>
        <line x1="132" x2="492" y1="172" y2="172" stroke={colors.line} />
        {[0, 0.25, 0.5, 0.75, 1].map((fraction) => (
          <g key={fraction}>
            <line
              x1={132 + fraction * 360}
              x2={132 + fraction * 360}
              y1="168"
              y2="177"
              stroke={colors.line}
            />
            <text x={132 + fraction * 360} y="197" textAnchor="middle">
              {Math.round(maxShots * fraction)}
            </text>
          </g>
        ))}
      </svg>
      <Legend
        items={[
          {color: colors.flight, label: 'model-guided local calibration'},
          {color: colors.target, label: 'empirical wheel-hood sweep'},
        ]}
      />

      <Controls>
        <Slider
          label="Distance stations"
          min={5}
          max={23}
          step={1}
          value={stations}
          onChange={setStations}
          format={(value) => `${value} stations`}
        />
        <Slider
          label="Model-guided pairs per station"
          min={1}
          max={7}
          step={1}
          value={modelPairs}
          onChange={setModelPairs}
          format={(value) => `${value} pairs`}
        />
        <Slider
          label="Empirical pairs per station"
          min={3}
          max={15}
          step={1}
          value={empiricalPairs}
          onChange={setEmpiricalPairs}
          format={(value) => `${value} pairs`}
        />
        <Slider
          label="Repeats per candidate pair"
          min={3}
          max={10}
          step={1}
          value={repeats}
          onChange={setRepeats}
          format={(value) => `${value} launches`}
        />
        <Slider
          label="Held-out shots per station"
          min={3}
          max={12}
          step={1}
          value={validation}
          onChange={setValidation}
          format={(value) => `${value} launches`}
        />
      </Controls>

      <div className={styles.metrics}>
        <div>
          Model-guided tuning<strong>{model.tuningShots}</strong>
          {stations} × {modelPairs} × {repeats}
        </div>
        <div>
          Empirical tuning<strong>{empirical.tuningShots}</strong>
          {stations} × {empiricalPairs} × {repeats}
        </div>
        <div>
          Held-out validation<strong>{model.validationShots}</strong>same budget for both
        </div>
        <div>
          Teaching-plan difference<strong>{empirical.totalShots - model.totalShots}</strong>physical
          launches
        </div>
      </div>
      <p className={styles.note}>
        This planner counts launches; it does not predict scoring probability. The model-guided lane
        assumes seven setup launches and a smaller local candidate set after simulation. Those are
        editable teaching assumptions, not a measured head-to-head experiment from the paper. Setup
        changes, failed feeds, warm-up shots, and retests would add to both totals.
      </p>
      <Buttons>
        <Button
          onClick={() => {
            setStations(8);
            setModelPairs(2);
            setEmpiricalPairs(5);
            setRepeats(3);
            setValidation(3);
          }}>
          Quick sketch
        </Button>
        <Button
          onClick={() => {
            setStations(23);
            setModelPairs(5);
            setEmpiricalPairs(15);
            setRepeats(10);
            setValidation(10);
          }}>
          Dense campaign
        </Button>
        <Button onClick={reset}>Reset comparison</Button>
      </Buttons>
    </Demo>
  );
}
