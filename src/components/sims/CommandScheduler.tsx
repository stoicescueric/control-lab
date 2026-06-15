/* A command scheduler running one autonomous routine: drive to a pose, then
   raise the lift and aim, then score. Toggle whether the lift+aim step runs as a
   PARALLEL group (overlapping, faster) or a SEQUENTIAL one (one after another),
   and watch the playhead sweep through — each bar is one Command, coloured by the
   subsystem it requires. Pure React state; no canvas. */

import {useEffect, useRef, useState} from 'react';
import {Demo, Button, Legend} from '@site/src/components/kit/Demo';

interface Cmd {
  name: string;
  sub: string;
  color: string;
  start: number;
  end: number;
}

// Per-command durations (seconds).
const D = {drive: 1.4, lift: 1.0, aim: 0.6, score: 0.5};

function schedule(parallel: boolean): {cmds: Cmd[]; total: number} {
  const drive: Cmd = {name: 'DriveToPose', sub: 'Drive', color: '#6f8bff', start: 0, end: D.drive};
  const lift: Cmd = {name: 'RaiseLift', sub: 'Lift', color: '#2fd3c0', start: D.drive, end: D.drive + D.lift};
  let aim: Cmd;
  let groupEnd: number;
  if (parallel) {
    // lift and aim start together; the group ends when the slower one finishes
    aim = {name: 'Aim', sub: 'Turret', color: '#ffc24d', start: D.drive, end: D.drive + D.aim};
    groupEnd = D.drive + Math.max(D.lift, D.aim);
  } else {
    // aim waits for lift to finish
    aim = {name: 'Aim', sub: 'Turret', color: '#ffc24d', start: lift.end, end: lift.end + D.aim};
    groupEnd = aim.end;
  }
  const score: Cmd = {name: 'Score', sub: 'Scorer', color: '#ff6f9c', start: groupEnd, end: groupEnd + D.score};
  return {cmds: [drive, lift, aim, score], total: score.end};
}

export default function CommandScheduler() {
  const [parallel, setParallel] = useState(true);
  const [playing, setPlaying] = useState(true);
  const [t, setT] = useState(0);

  const {cmds, total} = schedule(parallel);
  const playRef = useRef(playing);
  playRef.current = playing;
  const totalRef = useRef(total);
  totalRef.current = total;

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      if (playRef.current) {
        setT((prev) => (prev > totalRef.current + 0.5 ? 0 : prev + dt));
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const rowH = 40;
  const pct = (x: number) => `${(x / total) * 100}%`;
  const active = cmds.filter((c) => t >= c.start && t < c.end);
  const busy = active.map((c) => c.sub);

  return (
    <Demo title="The command scheduler">
      <div className="rounded-xl bg-black/25 p-4">
        <div className="relative" style={{height: cmds.length * rowH}}>
          {cmds.map((c, i) => (
            <div
              key={c.name}
              className="absolute flex items-center overflow-hidden rounded-md whitespace-nowrap px-2 text-[0.72rem] font-bold transition-[box-shadow]"
              style={{
                top: i * rowH,
                height: rowH - 8,
                left: pct(c.start),
                width: pct(c.end - c.start),
                background: c.color,
                color: '#04121a',
                opacity: t >= c.end ? 0.4 : t >= c.start ? 1 : 0.72,
                boxShadow: active.includes(c) ? '0 0 0 2px #fff' : 'none',
              }}>
              {c.name}
            </div>
          ))}
          <div
            className="absolute top-0 w-0.5 bg-white"
            style={{height: cmds.length * rowH - 8, left: pct(Math.min(t, total))}}
          />
        </div>
        <div className="mt-1 flex justify-between font-mono text-[0.68rem] text-[#8294b8]">
          <span>0.0 s</span>
          <span>{total.toFixed(1)} s total</span>
        </div>
      </div>

      <Legend
        items={[
          {color: '#6f8bff', label: 'Drive'},
          {color: '#2fd3c0', label: 'Lift'},
          {color: '#ffc24d', label: 'Turret'},
          {color: '#ff6f9c', label: 'Scorer'},
        ]}
      />

      <div className="mt-4 flex flex-wrap gap-2">
        <Button primary={playing} active={playing} onClick={() => setPlaying((v) => !v)}>
          {playing ? '⏸ Pause' : '▶ Play'}
        </Button>
        <Button onClick={() => setT(0)}>↺ Restart</Button>
        <Button
          active={parallel}
          onClick={() => {
            setParallel((v) => !v);
            setT(0);
          }}>
          Lift + Aim: {parallel ? 'parallel' : 'sequential'}
        </Button>
      </div>

      <div className="mt-2 flex flex-wrap gap-[18px] px-1 font-mono text-[0.82rem] text-[#aab8d6]">
        <span>
          t = <b className="text-white">{Math.min(t, total).toFixed(2)} s</b>
        </span>
        <span>
          running: <b className="text-white">{active.map((c) => c.name).join(' + ') || '— (done)'}</b>
        </span>
        <span>
          subsystems busy: <b className="text-white">{busy.length ? busy.join(', ') : '—'}</b>
        </span>
      </div>
    </Demo>
  );
}
