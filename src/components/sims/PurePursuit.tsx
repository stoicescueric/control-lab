/* Pure-pursuit path follower. The robot chases a "carrot" a fixed lookahead
   distance ahead on the path; drag the white waypoints to reshape it.

   Everything below runs in a FIXED world coordinate space (WX x WY world units,
   where 100 units = 1 m so the metric read-outs stay honest). The world is only
   mapped to the <canvas> at draw time with a single uniform `scale` + centering
   offset, exactly like the Kalman/EKF sims. That keeps the geometry AND the
   tuned parameters (lookahead, speed, thresholds) resolution-independent, so the
   robot follows the same-shaped path and wobbles the same way on a phone as on a
   desktop — previously they lived in raw canvas pixels and the behaviour drifted
   with the screen's width/aspect ratio. */

import {useRef, useState} from 'react';
import {useDprCanvas, useRaf} from '@site/src/lib/canvas';
import {Demo, Buttons, Button, Legend} from '@site/src/components/kit/Demo';
import {Slider} from '@site/src/components/kit/Slider';

const dt = 1 / 60;

// Fixed world the simulation lives in (world units; 100 units = 1 m).
const WX = 640;
const WY = 380;
const PAD = 12; // canvas padding (px) kept around the world when it's letterboxed

interface Pose {
  x: number;
  y: number;
  th: number;
}

export default function PurePursuit() {
  const [Ld, setLd] = useState(55);
  const [spd, setSpd] = useState(110);
  const [playing, setPlaying] = useState(true);
  const ldRef = useRef(Ld);
  const spdRef = useRef(spd);
  const playingRef = useRef(playing);
  ldRef.current = Ld;
  spdRef.current = spd;
  playingRef.current = playing;

  const canvas = useRef<HTMLCanvasElement | null>(null);
  const size = useDprCanvas(canvas, 400);

  const roCte = useRef<HTMLElement | null>(null);
  const roProg = useRef<HTMLElement | null>(null);

  const st = useRef({
    inited: false,
    waypoints: [] as number[][],
    path: [] as number[][],
    pose: null as Pose | null,
    pi: 0,
    trail: [] as number[][],
    cte: 0,
    carrot: null as number[] | null,
    drag: -1,
  });
  const acc = useRef(0);

  // World -> canvas mapping: a single uniform scale plus a centering offset, so
  // the field keeps its shape (letterboxed) on any canvas size. Recomputed from
  // the live canvas size; shared by both draw() and the pointer handlers.
  function view() {
    const {w, h} = size.current;
    const scale = Math.min((w - 2 * PAD) / WX, (h - 2 * PAD) / WY);
    const ox = (w - WX * scale) / 2;
    const oy = (h - WY * scale) / 2;
    return {scale, ox, oy};
  }

  function defaultPath() {
    st.current.waypoints = [
      [WX * 0.1, WY * 0.78],
      [WX * 0.3, WY * 0.3],
      [WX * 0.52, WY * 0.7],
      [WX * 0.74, WY * 0.28],
      [WX * 0.92, WY * 0.62],
    ];
  }

  function buildPath() {
    const s = st.current;
    const wp = s.waypoints;
    const path: number[][] = [];
    for (let k = 0; k < wp.length - 1; k++) {
      const a = wp[k];
      const b = wp[k + 1];
      const d = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const n = Math.max(2, Math.round(d / 5));
      for (let i = 0; i < n; i++) {
        const t = i / n;
        path.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
      }
    }
    path.push(wp[wp.length - 1].slice());
    s.path = path;
  }

  function restart() {
    const s = st.current;
    const a = s.path[0];
    const b = s.path[Math.min(8, s.path.length - 1)];
    s.pose = {x: a[0], y: a[1], th: Math.atan2(b[1] - a[1], b[0] - a[0])};
    s.pi = 0;
    s.trail = [];
  }

  function init() {
    defaultPath();
    buildPath();
    restart();
    st.current.inited = true;
  }

  function nearestAhead() {
    const s = st.current;
    const pose = s.pose!;
    let best = s.pi;
    let bd = 1e9;
    for (let i = s.pi; i < Math.min(s.path.length, s.pi + 80); i++) {
      const d = Math.hypot(s.path[i][0] - pose.x, s.path[i][1] - pose.y);
      if (d < bd) {
        bd = d;
        best = i;
      }
    }
    s.pi = best;
    return bd;
  }

  function lookaheadPt() {
    const s = st.current;
    const pose = s.pose!;
    const Ld = ldRef.current;
    for (let i = s.pi; i < s.path.length; i++) {
      if (Math.hypot(s.path[i][0] - pose.x, s.path[i][1] - pose.y) >= Ld) return s.path[i];
    }
    return s.path[s.path.length - 1];
  }

  function step() {
    if (!playingRef.current) return;
    const s = st.current;
    if (!s.pose) return;
    const v = spdRef.current;
    s.cte = nearestAhead();
    const last = s.path[s.path.length - 1];
    if (s.pi >= s.path.length - 2 && Math.hypot(s.pose.x - last[0], s.pose.y - last[1]) < 12) {
      restart();
      return;
    }
    s.carrot = lookaheadPt();
    const dx = s.carrot[0] - s.pose.x;
    const dy = s.carrot[1] - s.pose.y;
    const c = Math.cos(-s.pose.th);
    const sn = Math.sin(-s.pose.th);
    const xr = dx * c - dy * sn;
    const yr = dx * sn + dy * c;
    const L = Math.hypot(xr, yr) || ldRef.current;
    const curv = (2 * yr) / (L * L);
    const w = curv * v;
    s.pose.x += v * Math.cos(s.pose.th) * dt;
    s.pose.y += v * Math.sin(s.pose.th) * dt;
    s.pose.th += w * dt;
    const tr = s.trail;
    if (tr.length === 0 || Math.hypot(s.pose.x - tr[tr.length - 1][0], s.pose.y - tr[tr.length - 1][1]) > 3) {
      tr.push([s.pose.x, s.pose.y]);
      if (tr.length > 1200) tr.shift();
    }
  }

  function draw() {
    const cv = canvas.current;
    if (!cv) return;
    const cx = cv.getContext('2d');
    if (!cx) return;
    const {w, h} = size.current;
    const s = st.current;
    if (!s.pose) return;
    const Ld = ldRef.current;
    const {scale, ox, oy} = view();
    const PX = (x: number) => ox + x * scale;
    const PY = (y: number) => oy + y * scale;
    cx.fillStyle = '#0b1120';
    cx.fillRect(0, 0, w, h);
    // grid drawn in world space so the squares track the field, not the screen
    cx.strokeStyle = 'rgba(255,255,255,0.06)';
    cx.lineWidth = 1;
    for (let x = 0; x <= WX; x += 40) {
      cx.beginPath();
      cx.moveTo(PX(x), PY(0));
      cx.lineTo(PX(x), PY(WY));
      cx.stroke();
    }
    for (let y = 0; y <= WY; y += 40) {
      cx.beginPath();
      cx.moveTo(PX(0), PY(y));
      cx.lineTo(PX(WX), PY(y));
      cx.stroke();
    }
    const path = s.path;
    cx.strokeStyle = '#6f8bff';
    cx.lineWidth = 3;
    cx.globalAlpha = 0.85;
    cx.beginPath();
    cx.moveTo(PX(path[0][0]), PY(path[0][1]));
    for (let i = 1; i < path.length; i++) cx.lineTo(PX(path[i][0]), PY(path[i][1]));
    cx.stroke();
    cx.globalAlpha = 1;
    s.waypoints.forEach((p) => {
      cx.fillStyle = '#e8eefc';
      cx.strokeStyle = '#6f8bff';
      cx.lineWidth = 2;
      cx.beginPath();
      cx.arc(PX(p[0]), PY(p[1]), 7, 0, 7);
      cx.fill();
      cx.stroke();
    });
    if (s.trail.length > 1) {
      cx.strokeStyle = '#5ce08a';
      cx.lineWidth = 2;
      cx.globalAlpha = 0.8;
      cx.beginPath();
      cx.moveTo(PX(s.trail[0][0]), PY(s.trail[0][1]));
      for (let i = 1; i < s.trail.length; i++) cx.lineTo(PX(s.trail[i][0]), PY(s.trail[i][1]));
      cx.stroke();
      cx.globalAlpha = 1;
    }
    if (s.carrot) {
      cx.strokeStyle = 'rgba(255,194,77,0.25)';
      cx.lineWidth = 1.5;
      cx.setLineDash([4, 4]);
      cx.beginPath();
      cx.arc(PX(s.pose.x), PY(s.pose.y), Ld * scale, 0, 7);
      cx.stroke();
      cx.setLineDash([]);
      cx.strokeStyle = '#ffc24d';
      cx.lineWidth = 1.5;
      cx.beginPath();
      cx.moveTo(PX(s.pose.x), PY(s.pose.y));
      cx.lineTo(PX(s.carrot[0]), PY(s.carrot[1]));
      cx.stroke();
      cx.fillStyle = '#ffc24d';
      cx.beginPath();
      cx.arc(PX(s.carrot[0]), PY(s.carrot[1]), 6, 0, 7);
      cx.fill();
    }
    cx.save();
    cx.translate(PX(s.pose.x), PY(s.pose.y));
    cx.rotate(s.pose.th);
    cx.scale(scale, scale);
    cx.fillStyle = '#5ce08a';
    cx.beginPath();
    cx.moveTo(15, 0);
    cx.lineTo(-10, -10);
    cx.lineTo(-10, 10);
    cx.closePath();
    cx.fill();
    cx.restore();
    if (roCte.current) roCte.current.textContent = (s.cte / 100).toFixed(2) + ' m';
    if (roProg.current) roProg.current.textContent = Math.round((100 * s.pi) / (path.length - 1)) + '%';
  }

  useRaf((frameDt: number) => {
    if (!st.current.inited && size.current.w > 0) init();
    if (!st.current.inited) return;
    acc.current += Math.min(frameDt, 0.1);
    let k = 0;
    while (acc.current >= dt && k < 10) {
      step();
      acc.current -= dt;
      k++;
    }
    draw();
  }, canvas);

  // drag waypoints — pointer is read in canvas px, then projected back into world
  // coords so dragging lands in the same place regardless of the canvas size.
  function evtPos(ev: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>): [number, number] {
    const r = canvas.current!.getBoundingClientRect();
    const cxp = 'touches' in ev ? ev.touches[0].clientX : ev.clientX;
    const cyp = 'touches' in ev ? ev.touches[0].clientY : ev.clientY;
    return [cxp - r.left, cyp - r.top];
  }
  function onDown(ev: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) {
    const [mx, my] = evtPos(ev);
    const {scale, ox, oy} = view();
    const wp = st.current.waypoints;
    for (let i = 0; i < wp.length; i++) {
      // hit-test in screen px so the grab radius feels the same on every device
      if (Math.hypot(ox + wp[i][0] * scale - mx, oy + wp[i][1] * scale - my) < 16) {
        st.current.drag = i;
        break;
      }
    }
  }
  function onMove(ev: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) {
    const s = st.current;
    if (s.drag < 0) return;
    const [mx, my] = evtPos(ev);
    const {scale, ox, oy} = view();
    const wx = (mx - ox) / scale;
    const wy = (my - oy) / scale;
    s.waypoints[s.drag] = [Math.max(8, Math.min(WX - 8, wx)), Math.max(8, Math.min(WY - 8, wy))];
    buildPath();
    if (ev.cancelable) ev.preventDefault();
  }
  function onUp() {
    st.current.drag = -1;
  }

  return (
    <Demo title="Pure pursuit path follower">
      <canvas
        ref={canvas}
        role="img"
        aria-label="Interactive pure pursuit simulation; drag the waypoints to reshape the path the robot chases."
        className="block w-full touch-none rounded-xl bg-[#0b1120]"
        onMouseDown={onDown}
        onMouseMove={onMove}
        onMouseUp={onUp}
        onMouseLeave={onUp}
        onTouchStart={onDown}
        onTouchMove={onMove}
        onTouchEnd={onUp}
      />
      <Legend
        items={[
          {color: '#6f8bff', label: 'planned path'},
          {color: '#ffc24d', label: 'lookahead (carrot)', dot: true},
          {color: '#5ce08a', label: 'robot & trail'},
        ]}
      />
      <div className="mt-4 grid gap-x-[22px] gap-y-3.5 [grid-template-columns:repeat(auto-fit,minmax(210px,1fr))]">
        <div>
          <Slider label="Lookahead distance" value={Ld} min={14} max={150} step={2} onChange={setLd} format={(x) => (x / 100).toFixed(2) + ' m'} />
          <div className="mt-1 text-[0.74rem] text-[#8294b8]">Small = wobbly · Large = cuts corners.</div>
        </div>
        <Slider label="Robot speed" value={spd} min={40} max={200} step={5} onChange={setSpd} format={(x) => (x / 100).toFixed(2) + ' m/s'} />
      </div>
      <Buttons>
        <Button primary={playing} active={playing} onClick={() => setPlaying((v) => !v)}>
          {playing ? '⏸ Pause' : '▶ Play'}
        </Button>
        <Button onClick={restart}>↺ Restart from start</Button>
      </Buttons>
      <div className="mt-2 flex flex-wrap gap-[18px] px-1 font-mono text-[0.82rem] text-[#aab8d6]">
        <span>Cross-track error: <b ref={roCte} className="text-white">—</b></span>
        <span>Progress: <b ref={roProg} className="text-white">—</b></span>
      </div>
    </Demo>
  );
}
