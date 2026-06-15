/* A subsystem modelled as a finite state machine. There is exactly one current
   state; each event only does something when it is legal from that state, so
   illegal inputs (lift while idle, score with no sample) are safely ignored
   instead of corrupting the robot. Driver inputs and sensor events both drive
   the same transition function. */

import {Fragment, useState} from 'react';
import {Demo, Button} from '@site/src/components/kit/Demo';

type S = 'IDLE' | 'INTAKING' | 'LOADED' | 'RAISING' | 'SCORING';

const STATES: {id: S; desc: string}[] = [
  {id: 'IDLE', desc: 'at rest'},
  {id: 'INTAKING', desc: 'intake running'},
  {id: 'LOADED', desc: 'sample secured'},
  {id: 'RAISING', desc: 'arm moving up'},
  {id: 'SCORING', desc: 'releasing'},
];

interface Evt {
  id: string;
  label: string;
  kind: 'driver' | 'sensor';
  from: S;
  to: S;
}

const EVENTS: Evt[] = [
  {id: 'intake', label: '▶ Run intake', kind: 'driver', from: 'IDLE', to: 'INTAKING'},
  {id: 'cancel', label: '✋ Cancel', kind: 'driver', from: 'INTAKING', to: 'IDLE'},
  {id: 'lift', label: '▲ Lift', kind: 'driver', from: 'LOADED', to: 'RAISING'},
  {id: 'release', label: '⟲ Release & reset', kind: 'driver', from: 'SCORING', to: 'IDLE'},
  {id: 'detected', label: '⬤ Sample detected', kind: 'sensor', from: 'INTAKING', to: 'LOADED'},
  {id: 'attop', label: '⬤ Arm at top', kind: 'sensor', from: 'RAISING', to: 'SCORING'},
];

interface LogEntry {
  text: string;
  ok: boolean;
}

export default function StateMachine() {
  const [state, setState] = useState<S>('IDLE');
  const [log, setLog] = useState<LogEntry[]>([]);
  const [flash, setFlash] = useState(false);

  function fire(e: Evt) {
    if (e.from === state) {
      setState(e.to);
      setLog((l) => [{text: `${e.from} → ${e.to}`, ok: true}, ...l].slice(0, 7));
    } else {
      setFlash(true);
      setTimeout(() => setFlash(false), 320);
      setLog((l) => [{text: `✗ ignored "${e.label.replace(/^\S+\s/, '')}" — not legal in ${state}`, ok: false}, ...l].slice(0, 7));
    }
  }

  function reset() {
    setState('IDLE');
    setLog([]);
  }

  const validNow = EVENTS.filter((e) => e.from === state);
  const drivers = EVENTS.filter((e) => e.kind === 'driver');
  const sensors = EVENTS.filter((e) => e.kind === 'sensor');

  const group = (title: string, evts: Evt[]) => (
    <div className="mt-3">
      <div className="mb-1.5 text-[0.7rem] font-bold uppercase tracking-wide text-[#8294b8]">{title}</div>
      <div className="flex flex-wrap gap-2">
        {evts.map((e) => (
          <Button key={e.id} primary={e.from === state} onClick={() => fire(e)}>
            {e.label}
          </Button>
        ))}
      </div>
    </div>
  );

  return (
    <Demo title="A subsystem as a state machine">
      <div className="flex flex-wrap items-center gap-2 rounded-xl bg-black/25 p-4">
        {STATES.map((s, i) => (
          <Fragment key={s.id}>
            <div
              className={`flex min-w-[92px] flex-col items-center rounded-lg border px-3 py-2 text-center transition-colors ${
                s.id === state ? 'border-brand bg-brand/20 text-white' : 'border-white/15 bg-white/5 text-[#8294b8]'
              }`}>
              <span className="font-mono text-[0.8rem] font-bold">{s.id}</span>
              <span className="text-[0.66rem] leading-tight">{s.desc}</span>
            </div>
            {i < STATES.length - 1 && <span className="text-white/30">→</span>}
          </Fragment>
        ))}
        <span className="ml-1 font-mono text-[0.7rem] text-white/40">↺ back to IDLE</span>
      </div>

      {group('Driver inputs', drivers)}
      {group('Sensor / automatic events', sensors)}

      <div className="mt-4 flex flex-wrap gap-2">
        <Button onClick={reset}>↺ Reset machine</Button>
      </div>

      <div
        className={`mt-4 rounded-xl border bg-black/30 p-3 font-mono text-[0.78rem] transition-colors ${
          flash ? 'border-rose' : 'border-white/10'
        }`}>
        <div className="mb-1 text-[0.7rem] uppercase tracking-wide text-[#8294b8]">Transition log</div>
        {log.length === 0 ? (
          <div className="text-[#66748f]">Fire an event to begin…</div>
        ) : (
          log.map((e, i) => (
            <div key={i} style={{color: e.ok ? '#5ce08a' : '#ff6f9c'}}>
              {e.text}
            </div>
          ))
        )}
      </div>

      <div className="mt-3 px-1 font-mono text-[0.82rem] text-[#aab8d6]">
        Current state: <b style={{color: '#6f8bff'}}>{state}</b> · legal now:{' '}
        <b className="text-white">{validNow.map((e) => e.label.replace(/^\S+\s/, '')).join(', ') || '—'}</b>
      </div>
    </Demo>
  );
}
