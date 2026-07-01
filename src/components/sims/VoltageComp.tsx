/* Voltage (battery) compensation, live. A raw power command delivers
   power × Vbattery volts, so the same command quietly does less as the pack
   sags; compensation divides by the measured voltage and holds the target flat
   until the battery physically can't reach it. Drag the battery marker along
   the curve, or press play and watch a whole match of sag + load spikes ride
   both curves. */

import {useRef, useState} from 'react';
import {usePlot, useRaf} from '@site/src/lib/canvas';
import {Demo, Controls, Buttons, Button, Legend} from '@site/src/components/kit/Demo';
import {Slider} from '@site/src/components/kit/Slider';

const VB_MIN = 10.5;
const VB_MAX = 13.5;
const MATCH_T = 24; // seconds of simulated match

export default function VoltageComp() {
  const [targetV, setTargetV] = useState(8);
  const [battery, setBattery] = useState(13.2);
  const [playing, setPlaying] = useState(true);
  const ctrl = useRef({targetV, battery, playing});
  ctrl.current = {targetV, battery, playing};

  const canvas = useRef<HTMLCanvasElement | null>(null);
  const plotRef = usePlot(canvas, {
    height: 320,
    xmin: VB_MIN,
    xmax: VB_MAX,
    ymin: 0,
    ymax: 13.5,
    yLabel: 'delivered volts',
    xLabel: 'battery voltage (sagging is leftward)',
  });

  const roRaw = useRef<HTMLElement | null>(null);
  const roComp = useRef<HTMLElement | null>(null);
  const roDrift = useRef<HTMLElement | null>(null);
  const roClock = useRef<HTMLElement | null>(null);

  const st = useRef({t: 0, vb: 13.2, dragging: false});
  const throttle = useRef(0);

  // battery over a match: a steady drain plus load spikes when the robot sprints
  function matchVb(t: number) {
    const base = 13.4 - (2.1 * t) / MATCH_T;
    const load = Math.max(0, Math.sin(t * 1.1) + Math.sin(t * 2.3) - 0.7);
    return Math.max(VB_MIN + 0.05, base - 0.55 * load);
  }

  function draw(frameDt: number) {
    const p = plotRef.current;
    if (!p) return;
    const s = st.current;
    const {targetV, playing} = ctrl.current;

    if (playing && !s.dragging) {
      s.t = (s.t + frameDt) % MATCH_T;
      s.vb = matchVb(s.t);
      // keep the slider display roughly in sync without re-rendering every frame
      throttle.current += frameDt;
      if (throttle.current > 0.15) {
        throttle.current = 0;
        setBattery(Math.round(s.vb * 10) / 10);
      }
    }

    const command = targetV / 12; // "tuned at 12 V" fixed power setting
    const raw = (vb: number) => command * vb;
    const comp = (vb: number) => Math.min(targetV, vb);
    const rawNow = raw(s.vb);
    const compNow = comp(s.vb);

    p.clear();
    p.grid();
    p.clip(() => {
      // region where even compensation can't reach the target
      if (targetV > VB_MIN) {
        const xSat = Math.min(targetV, VB_MAX);
        p.band(
          [
            [VB_MIN, 0, 13.5],
            [xSat, 0, 13.5],
          ],
          'rgba(255,111,156,0.07)',
        );
      }
      p.hline(targetV, {color: '#8294b8', width: 1.2, dash: [2, 8]});
      p.line(
        [
          [VB_MIN, raw(VB_MIN)],
          [VB_MAX, raw(VB_MAX)],
        ],
        {color: '#ff6f9c', width: 3},
      );
      p.line(
        [
          [VB_MIN, comp(VB_MIN)],
          [VB_MAX, comp(VB_MAX)],
        ],
        {color: '#5ce08a', width: 3.5},
      );
      // battery marker + the two delivered operating points
      p.vline(s.vb, {color: '#ffc24d', width: 1.5, dash: [4, 4]});
      p.dot(s.vb, rawNow, {color: '#ff6f9c', r: 5, ring: '#0b1120', ringW: 2});
      p.dot(s.vb, compNow, {color: '#5ce08a', r: 5, ring: '#0b1120', ringW: 2});
      // drag handle on the axis
      p.dot(s.vb, 0, {color: '#ffc24d', r: 7, ring: '#0b1120', ringW: 2});
    });
    p.text(s.vb, 0.55, s.dragging ? 'battery' : 'battery ⟵ drag me', {
      color: '#ffc24d',
      align: s.vb > 12.6 ? 'right' : 'left',
      font: '11px ui-monospace, monospace',
    });
    p.text(VB_MAX - 0.05, targetV + 0.45, `target ${targetV.toFixed(1)} V`, {
      color: '#8294b8',
      align: 'right',
      font: '11px ui-monospace, monospace',
    });

    if (roRaw.current) roRaw.current.textContent = rawNow.toFixed(2) + ' V';
    if (roComp.current) {
      roComp.current.textContent = compNow.toFixed(2) + ' V';
      roComp.current.style.color = compNow < targetV - 0.01 ? '#ffc24d' : '#5ce08a';
    }
    if (roDrift.current) {
      const d = rawNow - targetV;
      roDrift.current.textContent = (d >= 0 ? '+' : '') + d.toFixed(2) + ' V';
      roDrift.current.style.color = Math.abs(d) > 0.4 ? '#ff6f9c' : '#fff';
    }
    if (roClock.current) {
      roClock.current.textContent = ctrl.current.playing ? s.t.toFixed(0) + ' s' : 'paused';
    }
  }

  useRaf((frameDt: number) => draw(Math.min(frameDt, 0.1)), canvas);

  function pointToVb(ev: React.PointerEvent<HTMLCanvasElement>) {
    const p = plotRef.current;
    const el = canvas.current;
    if (!p || !el) return;
    const rect = el.getBoundingClientRect();
    const vb = p.ix(ev.clientX - rect.left);
    st.current.vb = Math.max(VB_MIN, Math.min(VB_MAX, vb));
    setBattery(Math.round(st.current.vb * 10) / 10);
  }

  return (
    <Demo title="Voltage compensation — the same command on a sagging battery">
      <canvas
        ref={canvas}
        role="img"
        aria-label="Delivered motor voltage versus battery voltage; drag the battery marker or play a simulated match."
        className="block w-full touch-none rounded-xl bg-[#0b1120]"
        style={{cursor: 'ew-resize'}}
        onPointerDown={(e) => {
          st.current.dragging = true;
          e.currentTarget.setPointerCapture(e.pointerId);
          pointToVb(e);
        }}
        onPointerMove={(e) => st.current.dragging && pointToVb(e)}
        onPointerUp={() => (st.current.dragging = false)}
        onPointerCancel={() => (st.current.dragging = false)}
      />
      <Legend
        items={[
          {color: '#5ce08a', label: 'compensated — flat at target'},
          {color: '#ff6f9c', label: 'raw command — drifts with battery'},
          {color: '#ffc24d', label: 'battery voltage now', dot: true},
        ]}
      />

      <Controls>
        <Slider label="Target motor voltage" min={3} max={12} step={0.5} value={targetV} onChange={setTargetV} format={(v) => `${v.toFixed(1)} V`} />
        <Slider
          label="Battery voltage now"
          min={VB_MIN}
          max={VB_MAX}
          step={0.1}
          value={battery}
          onChange={(v) => {
            setBattery(v);
            st.current.vb = v;
            setPlaying(false);
          }}
          format={(v) => `${v.toFixed(1)} V`}
        />
      </Controls>
      <Buttons>
        <Button active={playing} onClick={() => setPlaying((p) => !p)}>
          {playing ? '❚❚ Pause the match' : '▶ Play a match'}
        </Button>
        <Button
          onClick={() => {
            st.current.t = 0;
            st.current.vb = 13.2;
            setTargetV(8);
            setBattery(13.2);
            setPlaying(true);
          }}>
          ↺ Reset
        </Button>
      </Buttons>
      <div className="mt-2 flex flex-wrap gap-[18px] px-1 font-mono text-[0.82rem] text-[#aab8d6]">
        <span>
          Raw (no comp): <b ref={roRaw} className="text-white">—</b>
        </span>
        <span>
          Compensated: <b ref={roComp} className="text-white">—</b>
        </span>
        <span>
          Raw drift vs target: <b ref={roDrift} className="text-white">—</b>
        </span>
        <span>
          Match clock: <b ref={roClock} className="text-white">—</b>
        </span>
      </div>
    </Demo>
  );
}
