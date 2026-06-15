/* Pure-pursuit path follower. The robot chases a "carrot" a fixed lookahead
   distance ahead on the path; drag the white waypoints to reshape it. */

import {useRef, useState} from 'react';
import {useDprCanvas, useRaf} from '@site/src/lib/canvas';
import {Demo, Buttons, Button, Legend} from '@site/src/components/kit/Demo';
import {Slider} from '@site/src/components/kit/Slider';

const dt = 1 / 60;

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

  function defaultPath() {
    const {w, h} = size.current;
    st.current.waypoints = [
      [w * 0.1, h * 0.78],
      [w * 0.3, h * 0.3],
      [w * 0.52, h * 0.7],
      [w * 0.74, h * 0.28],
      [w * 0.92, h * 0.62],
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
    cx.fillStyle = '#0b1120';
    cx.fillRect(0, 0, w, h);
    cx.strokeStyle = 'rgba(255,255,255,0.06)';
    cx.lineWidth = 1;
    for (let x = 0; x <= w; x += 40) {
      cx.beginPath();
      cx.moveTo(x, 0);
      cx.lineTo(x, h);
      cx.stroke();
    }
    for (let y = 0; y <= h; y += 40) {
      cx.beginPath();
      cx.moveTo(0, y);
      cx.lineTo(w, y);
      cx.stroke();
    }
    const path = s.path;
    cx.strokeStyle = '#6f8bff';
    cx.lineWidth = 3;
    cx.globalAlpha = 0.85;
    cx.beginPath();
    cx.moveTo(path[0][0], path[0][1]);
    for (let i = 1; i < path.length; i++) cx.lineTo(path[i][0], path[i][1]);
    cx.stroke();
    cx.globalAlpha = 1;
    s.waypoints.forEach((p) => {
      cx.fillStyle = '#e8eefc';
      cx.strokeStyle = '#6f8bff';
      cx.lineWidth = 2;
      cx.beginPath();
      cx.arc(p[0], p[1], 7, 0, 7);
      cx.fill();
      cx.stroke();
    });
    if (s.trail.length > 1) {
      cx.strokeStyle = '#5ce08a';
      cx.lineWidth = 2;
      cx.globalAlpha = 0.8;
      cx.beginPath();
      cx.moveTo(s.trail[0][0], s.trail[0][1]);
      for (let i = 1; i < s.trail.length; i++) cx.lineTo(s.trail[i][0], s.trail[i][1]);
      cx.stroke();
      cx.globalAlpha = 1;
    }
    if (s.carrot) {
      cx.strokeStyle = 'rgba(255,194,77,0.25)';
      cx.lineWidth = 1.5;
      cx.setLineDash([4, 4]);
      cx.beginPath();
      cx.arc(s.pose.x, s.pose.y, Ld, 0, 7);
      cx.stroke();
      cx.setLineDash([]);
      cx.strokeStyle = '#ffc24d';
      cx.lineWidth = 1.5;
      cx.beginPath();
      cx.moveTo(s.pose.x, s.pose.y);
      cx.lineTo(s.carrot[0], s.carrot[1]);
      cx.stroke();
      cx.fillStyle = '#ffc24d';
      cx.beginPath();
      cx.arc(s.carrot[0], s.carrot[1], 6, 0, 7);
      cx.fill();
    }
    cx.save();
    cx.translate(s.pose.x, s.pose.y);
    cx.rotate(s.pose.th);
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
  });

  // drag waypoints
  function evtPos(ev: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>): [number, number] {
    const r = canvas.current!.getBoundingClientRect();
    const cxp = 'touches' in ev ? ev.touches[0].clientX : ev.clientX;
    const cyp = 'touches' in ev ? ev.touches[0].clientY : ev.clientY;
    return [cxp - r.left, cyp - r.top];
  }
  function onDown(ev: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) {
    const [mx, my] = evtPos(ev);
    const wp = st.current.waypoints;
    for (let i = 0; i < wp.length; i++) {
      if (Math.hypot(wp[i][0] - mx, wp[i][1] - my) < 14) {
        st.current.drag = i;
        break;
      }
    }
  }
  function onMove(ev: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) {
    const s = st.current;
    if (s.drag < 0) return;
    const [mx, my] = evtPos(ev);
    const {w, h} = size.current;
    s.waypoints[s.drag] = [Math.max(8, Math.min(w - 8, mx)), Math.max(8, Math.min(h - 8, my))];
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
