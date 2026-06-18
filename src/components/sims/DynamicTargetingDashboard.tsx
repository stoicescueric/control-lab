import {useEffect, useMemo, useRef, useState} from 'react';
import InterpolationTrap from '@site/src/components/sims/InterpolationTrap';
import ShootOnTheMove from '@site/src/components/sims/ShootOnTheMove';
import {Button, Controls, Demo, Legend, Readout} from '@site/src/components/kit/Demo';
import {Slider} from '@site/src/components/kit/Slider';
import {clamp} from '@site/src/lib/projectile';

type TabId = 'flywheel' | 'interpolation' | 'sotm';
type Sample = {t: number; value: number};

const TARGET = 2500;
const READY_BAND = 80;
const DT = 1 / 120;

// A deliberately simple flywheel plant: command voltage spins the wheel up
// while drag slows it down. accel = TORQUE_K * voltage - DRAG_K * drag(speed).
const TORQUE_K = 185;
const DRAG_K = 58;
const flywheelDrag = (speed: number) => 0.0028 * speed + 0.00000022 * speed * speed;
// Feedforward that exactly holds the target: the voltage at which the wheel's
// drag is balanced at TARGET. This is the k_S + k_V * r term, tuned so the
// recovered trace settles on the setpoint instead of drifting off-chart.
const FF_VOLTS = (DRAG_K * flywheelDrag(TARGET)) / TORQUE_K;

function FlywheelRecovery() {
  const [feedforward, setFeedforward] = useState(true);
  const [pid, setPid] = useState(true);
  const [bangBang, setBangBang] = useState(true);
  const [aggression, setAggression] = useState(1);
  const [frame, setFrame] = useState(0);
  const model = useRef({
    t: 0,
    speed: TARGET,
    samples: [{t: 0, value: TARGET}] as Sample[],
    lastVoltage: 0,
  });
  const toggles = useRef({feedforward, pid, bangBang, aggression});
  toggles.current = {feedforward, pid, bangBang, aggression};

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let accumulator = 0;
    let renderAccumulator = 0;

    const tick = (now: number) => {
      const elapsed = Math.min(0.08, (now - last) / 1000);
      last = now;
      accumulator += elapsed;
      renderAccumulator += elapsed;

      while (accumulator >= DT) {
        const m = model.current;
        const {feedforward: ffOn, pid: pidOn, bangBang: bbOn, aggression: bbScale} = toggles.current;
        const error = TARGET - m.speed;

        // The controller choices below are the lesson: feedforward holds the
        // steady-state setpoint, PID trims residual error, and bang-bang
        // saturates only when the wheel is below the ready band after a shot.
        const ff = ffOn ? FF_VOLTS : 0;
        const feedback = pidOn ? 0.006 * error : 0;
        const recoveryKick = bbOn && error > READY_BAND ? 5.2 * bbScale : 0;
        const voltage = clamp(ff + feedback + recoveryKick, 0, 12);
        const acceleration = TORQUE_K * voltage - DRAG_K * flywheelDrag(m.speed);

        m.speed = clamp(m.speed + acceleration * DT, 0, 3100);
        m.t += DT;
        m.lastVoltage = voltage;
        m.samples.push({t: m.t, value: m.speed});
        while (m.samples.length > 520 || (m.samples[0] && m.t - m.samples[0].t > 4.5)) m.samples.shift();
        accumulator -= DT;
      }

      if (renderAccumulator > 1 / 30) {
        setFrame((v) => v + 1);
        renderAccumulator = 0;
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const m = model.current;
  const samples = m.samples;
  const W = 720;
  const H = 360;
  const padL = 54;
  const padR = 20;
  const padT = 22;
  const padB = 36;
  const xMin = Math.max(0, m.t - 4.5);
  const xMax = Math.max(4.5, m.t);
  const yMin = TARGET - 520;
  const yMax = TARGET + 260;
  const sx = (x: number) => padL + ((x - xMin) / (xMax - xMin)) * (W - padL - padR);
  const sy = (y: number) => padT + (1 - (y - yMin) / (yMax - yMin)) * (H - padT - padB);
  const path =
    samples.length === 0
      ? ''
      : 'M ' + samples.map((p) => `${sx(p.t).toFixed(1)} ${sy(p.value).toFixed(1)}`).join(' L ');
  const ready = Math.abs(TARGET - m.speed) <= READY_BAND;

  function takeShot() {
    const s = model.current;
    s.speed = clamp(s.speed - 300, 0, 3100);
    s.samples.push({t: s.t, value: s.speed});
    setFrame((v) => v + 1);
  }

  function reset() {
    model.current = {t: 0, speed: TARGET, samples: [{t: 0, value: TARGET}], lastVoltage: 0};
    setFrame((v) => v + 1);
  }

  return (
    <>
      <svg
        key={frame}
        viewBox={`0 0 ${W} ${H}`}
        className="block h-auto w-full rounded-xl bg-[#0b1120]"
        role="img"
        aria-label="Flywheel velocity recovery line chart after a shot disturbance.">
        <rect x={padL} y={sy(TARGET + READY_BAND)} width={W - padL - padR} height={sy(TARGET - READY_BAND) - sy(TARGET + READY_BAND)} fill="rgba(92,224,138,0.10)" />
        <line x1={padL} y1={sy(TARGET)} x2={W - padR} y2={sy(TARGET)} stroke="#6f8bff" strokeWidth="2" strokeDasharray="6 5" />
        <line x1={padL} y1={sy(TARGET + READY_BAND)} x2={W - padR} y2={sy(TARGET + READY_BAND)} stroke="#5ce08a" strokeWidth="1.5" strokeDasharray="3 5" />
        <line x1={padL} y1={sy(TARGET - READY_BAND)} x2={W - padR} y2={sy(TARGET - READY_BAND)} stroke="#5ce08a" strokeWidth="1.5" strokeDasharray="3 5" />
        {[2000, 2250, 2500, 2750].map((y) => (
          <g key={y}>
            <line x1={padL} y1={sy(y)} x2={W - padR} y2={sy(y)} stroke="rgba(255,255,255,0.05)" />
            <text x={padL - 10} y={sy(y) + 4} textAnchor="end" fontFamily="JetBrains Mono, monospace" fontSize="11" fill="#8294b8">
              {y}
            </text>
          </g>
        ))}
        <path d={path} fill="none" stroke={ready ? '#5ce08a' : '#ff6f9c'} strokeWidth="3.5" strokeLinecap="round" />
        <circle cx={samples.length ? sx(samples[samples.length - 1].t) : padL} cy={sy(clamp(m.speed, yMin, yMax))} r="5.5" fill={ready ? '#5ce08a' : '#ff6f9c'} />
        <text x={W - padR} y={padT + 12} textAnchor="end" fontFamily="JetBrains Mono, monospace" fontSize="12" fill="#aab8d6">
          target = {TARGET} ticks/s, ready band = +/- {READY_BAND}
        </text>
      </svg>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button primary onClick={takeShot}>
          Take Shot (-300 ticks/s)
        </Button>
        <Button active={feedforward} onClick={() => setFeedforward((v) => !v)}>
          Feedforward {feedforward ? 'on' : 'off'}
        </Button>
        <Button active={pid} onClick={() => setPid((v) => !v)}>
          PID {pid ? 'on' : 'off'}
        </Button>
        <Button active={bangBang} onClick={() => setBangBang((v) => !v)}>
          Asymmetric Bang-Bang {bangBang ? 'on' : 'off'}
        </Button>
        <Button onClick={reset}>Reset</Button>
      </div>

      <Controls>
        <Slider label="Bang-bang recovery aggression" min={0.4} max={1.5} step={0.05} value={aggression} onChange={setAggression} format={(v) => `${v.toFixed(2)}x`} />
      </Controls>
      <Readout
        items={[
          ['Speed', `${m.speed.toFixed(0)} ticks/s`],
          ['Error', `${(TARGET - m.speed).toFixed(0)} ticks/s`],
          ['Command voltage', `${m.lastVoltage.toFixed(1)} V`],
          ['Status', ready ? 'ready' : 'recovering'],
        ]}
      />
      <Legend
        items={[
          {color: '#6f8bff', label: 'target speed'},
          {color: '#5ce08a', label: 'ready band and recovered trace'},
          {color: '#ff6f9c', label: 'outside ready band'},
        ]}
      />
    </>
  );
}

const tabs: {id: TabId; label: string; title: string}[] = [
  {id: 'flywheel', label: 'Step 1', title: 'Taming the Flywheel'},
  {id: 'interpolation', label: 'Step 2', title: 'The Interpolation Trap'},
  {id: 'sotm', label: 'Step 3', title: 'Shoot-On-The-Move'},
];

export default function DynamicTargetingDashboard() {
  const [active, setActive] = useState<TabId>('flywheel');
  const current = useMemo(() => tabs.find((tab) => tab.id === active)!, [active]);

  return (
    <Demo title={`On-Bot Control - ${current.title}`} pill="Research dashboard">
      <div className="mb-4 flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <Button key={tab.id} active={active === tab.id} primary={active === tab.id} onClick={() => setActive(tab.id)}>
            {tab.label}: {tab.title}
          </Button>
        ))}
      </div>

      {active === 'flywheel' && <FlywheelRecovery />}
      {active === 'interpolation' && <InterpolationTrap />}
      {active === 'sotm' && <ShootOnTheMove />}
    </Demo>
  );
}
