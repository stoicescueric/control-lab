import {useEffect, useMemo, useRef, useState} from 'react';
import {Button, Buttons, Controls, Legend} from '@site/src/components/kit/Demo';
import {Slider} from '@site/src/components/kit/Slider';
import type {LaunchCandidate} from '@site/src/lib/domain/launchSelection';
import {
  GOAL_DEPTH,
  H_RIM,
  INCH,
  entersGoal,
  simulateDrag,
  type Pt,
} from '@site/src/lib/domain/projectile';
import {colors} from './ResearchFigures';
import styles from './Research.module.css';

type Mode = 'family' | 'cloud';
interface Trace {
  points: Pt[];
  made: boolean;
  selected?: boolean;
}

function bestPerAngle(candidates: LaunchCandidate[]): LaunchCandidate[] {
  const byAngle = new Map<string, LaunchCandidate>();
  for (const candidate of candidates) {
    const key = candidate.angle.toFixed(1);
    const current = byAngle.get(key);
    if (
      !current ||
      candidate.coverage > current.coverage ||
      (candidate.coverage === current.coverage && candidate.speed < current.speed)
    ) {
      byAngle.set(key, candidate);
    }
  }
  const family = [...byAngle.values()].sort((a, b) => a.angle - b.angle);
  if (family.length <= 45) return family;
  return Array.from({length: 45}, (_, i) => family[Math.round((i * (family.length - 1)) / 44)]);
}

function makeTraces(
  mode: Mode,
  candidate: LaunchCandidate,
  candidates: LaunchCandidate[],
  distanceIn: number,
): Trace[] {
  const commands =
    mode === 'family'
      ? bestPerAngle(candidates).map(({speed, angle}) => ({speed, angle}))
      : Array.from({length: 9 * 9}, (_, index) => {
          const row = Math.floor(index / 9);
          const col = index % 9;
          return {
            speed: candidate.speed - 0.7 + (row * 1.4) / 8,
            angle: candidate.angle - 1.5 + (col * 3) / 8,
          };
        });
  const frontLip = distanceIn * INCH;
  const traces: Trace[] = commands.map(({speed, angle}) => {
    const flight = simulateDrag({
      v0: speed,
      angle: (angle * Math.PI) / 180,
      dt: 0.02,
      maxX: frontLip + GOAL_DEPTH + 0.5,
    });
    return {points: flight.pts, made: entersGoal(flight.rimCross, frontLip)};
  });
  const nominal = simulateDrag({
    v0: candidate.speed,
    angle: (candidate.angle * Math.PI) / 180,
    dt: 0.01,
    maxX: frontLip + GOAL_DEPTH + 0.5,
  });
  traces.push({points: nominal.pts, made: true, selected: true});
  return traces;
}

function rgb(hex: string, alpha = 1): [number, number, number, number] {
  const value = hex.replace('#', '');
  return [
    Number.parseInt(value.slice(0, 2), 16) / 255,
    Number.parseInt(value.slice(2, 4), 16) / 255,
    Number.parseInt(value.slice(4, 6), 16) / 255,
    alpha,
  ];
}

function createShader(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

export default function ShotFamily3D({
  candidate,
  candidates,
  distance,
}: {
  candidate: LaunchCandidate;
  candidates: LaunchCandidate[];
  distance: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragRef = useRef<{x: number; azimuth: number} | null>(null);
  const [mode, setMode] = useState<Mode>('family');
  const [azimuth, setAzimuth] = useState(-28);
  const [elevation, setElevation] = useState(22);
  const [available, setAvailable] = useState(true);
  const traces = useMemo(
    () => makeTraces(mode, candidate, candidates, distance),
    [mode, candidate, candidates, distance],
  );
  const shown = traces.slice(0, -1);
  const made = shown.filter((trace) => trace.made).length;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext('webgl', {alpha: false, antialias: true});
    if (!gl) {
      setAvailable(false);
      return;
    }
    const vertex = createShader(
      gl,
      gl.VERTEX_SHADER,
      'attribute vec2 position; attribute vec4 color; varying vec4 vColor; void main(){ gl_Position=vec4(position,0.0,1.0); vColor=color; }',
    );
    const fragment = createShader(
      gl,
      gl.FRAGMENT_SHADER,
      'precision mediump float; varying vec4 vColor; void main(){ gl_FragColor=vColor; }',
    );
    if (!vertex || !fragment) {
      setAvailable(false);
      return;
    }
    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      setAvailable(false);
      return;
    }
    const position = gl.getAttribLocation(program, 'position');
    const color = gl.getAttribLocation(program, 'color');
    const buffer = gl.createBuffer();
    const front = distance * INCH;
    const xMax = front + GOAL_DEPTH + 0.45;
    const az = (azimuth * Math.PI) / 180;
    const el = (elevation * Math.PI) / 180;
    const center: [number, number, number] = [xMax * 0.5, 0, 0.72];
    const project = (x: number, y: number, z: number): [number, number] => {
      const px = x - center[0];
      const py = y - center[1];
      const pz = z - center[2];
      const right = px * Math.cos(az) - py * Math.sin(az);
      const depth = px * Math.sin(az) + py * Math.cos(az);
      const up = pz * Math.cos(el) - depth * Math.sin(el);
      return [(right / (xMax * 0.58)) * 0.92, (up / 1.32) * 0.92];
    };
    const data: number[] = [];
    const addLine = (
      a: [number, number, number],
      b: [number, number, number],
      tone: [number, number, number, number],
    ) => {
      const pa = project(...a);
      const pb = project(...b);
      data.push(pa[0], pa[1], ...tone, pb[0], pb[1], ...tone);
    };
    const addPolyline = (points: Pt[], tone: [number, number, number, number]) => {
      for (let i = 1; i < points.length; i++) {
        addLine([points[i - 1].x, 0, points[i - 1].y], [points[i].x, 0, points[i].y], tone);
      }
    };

    const gridTone: [number, number, number, number] = [0.22, 0.3, 0.43, 0.34];
    for (let x = 0; x <= xMax + 0.001; x += 0.25) addLine([x, -0.72, 0], [x, 0.72, 0], gridTone);
    for (let y = -0.72; y <= 0.72; y += 0.24) addLine([0, y, 0], [xMax, y, 0], gridTone);

    const goalTone = rgb(colors.good, 0.95);
    const width = 0.72;
    const left = -width / 2;
    const right = width / 2;
    const back = front + GOAL_DEPTH;
    for (const x of [front, back]) {
      addLine([x, left, H_RIM], [x, right, H_RIM], goalTone);
      addLine([x, left, 0], [x, left, H_RIM], goalTone);
      addLine([x, right, 0], [x, right, H_RIM], goalTone);
    }
    addLine([front, left, H_RIM], [back, left, H_RIM], goalTone);
    addLine([front, right, H_RIM], [back, right, H_RIM], goalTone);
    addLine([0, -0.16, 0], [0, -0.16, 0.4], rgb(colors.flight, 0.95));
    addLine([0, 0.16, 0], [0, 0.16, 0.4], rgb(colors.flight, 0.95));

    for (const trace of traces) {
      const tone = trace.selected
        ? rgb(colors.target, 1)
        : trace.made
          ? rgb(colors.good, mode === 'family' ? 0.62 : 0.42)
          : rgb(colors.miss, 0.26);
      addPolyline(trace.points, tone);
    }

    const array = new Float32Array(data);
    const draw = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      const widthPx = Math.max(1, Math.round(rect.width * ratio));
      const heightPx = Math.max(1, Math.round(rect.height * ratio));
      if (canvas.width !== widthPx || canvas.height !== heightPx) {
        canvas.width = widthPx;
        canvas.height = heightPx;
      }
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clearColor(0.043, 0.067, 0.125, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.useProgram(program);
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, array, gl.STATIC_DRAW);
      gl.enableVertexAttribArray(position);
      gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 24, 0);
      gl.enableVertexAttribArray(color);
      gl.vertexAttribPointer(color, 4, gl.FLOAT, false, 24, 8);
      gl.drawArrays(gl.LINES, 0, array.length / 6);
    };
    draw();
    const observer = new ResizeObserver(draw);
    observer.observe(canvas);
    return () => {
      observer.disconnect();
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      gl.deleteShader(vertex);
      gl.deleteShader(fragment);
    };
  }, [traces, distance, azimuth, elevation, mode]);

  return (
    <section className={styles.familyStage} aria-labelledby="shot-family-title">
      <div className={styles.labHeader}>
        <div>
          <span>Simulator view 03 · WebGL</span>
          <strong id="shot-family-title">Orbit the scoring family</strong>
        </div>
        <b>
          {mode === 'family'
            ? `${shown.length} scoring arcs`
            : `${made} / ${shown.length} shown enter`}
        </b>
      </div>
      {available ? (
        <div className={styles.webglWrap}>
          <canvas
            ref={canvasRef}
            className={styles.webglCanvas}
            tabIndex={0}
            role="application"
            aria-label={`Interactive 3D field view of ${shown.length} trajectories. Drag horizontally or use arrow keys to rotate. The selected path is gold.`}
            onPointerDown={(event) => {
              dragRef.current = {x: event.clientX, azimuth};
              event.currentTarget.setPointerCapture(event.pointerId);
            }}
            onPointerMove={(event) => {
              if (!dragRef.current) return;
              setAzimuth(
                Math.max(
                  -65,
                  Math.min(
                    15,
                    dragRef.current.azimuth + (event.clientX - dragRef.current.x) * 0.25,
                  ),
                ),
              );
            }}
            onPointerUp={() => (dragRef.current = null)}
            onPointerCancel={() => (dragRef.current = null)}
            onKeyDown={(event) => {
              if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
                event.preventDefault();
                setAzimuth((value) =>
                  Math.max(-65, Math.min(15, value + (event.key === 'ArrowLeft' ? -4 : 4))),
                );
              }
              if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
                event.preventDefault();
                setElevation((value) =>
                  Math.max(8, Math.min(45, value + (event.key === 'ArrowUp' ? 3 : -3))),
                );
              }
            }}
          />
          <span className={styles.webglBadge}>LIVE WEBGL · DRAG TO ORBIT</span>
        </div>
      ) : (
        <div className={styles.webglFallback} role="status">
          WebGL is unavailable. The side view and tolerance map still show the same trajectories.
        </div>
      )}
      <Legend
        items={[
          {color: colors.target, label: 'selected command'},
          {color: colors.good, label: 'enters'},
          ...(mode === 'cloud' ? [{color: colors.miss, label: 'misses'}] : []),
        ]}
      />
      <Buttons>
        <Button active={mode === 'family'} onClick={() => setMode('family')}>
          Scoring family
        </Button>
        <Button active={mode === 'cloud'} onClick={() => setMode('cloud')}>
          Perturbation cloud
        </Button>
        <Button
          onClick={() => {
            setAzimuth(-28);
            setElevation(22);
          }}>
          Reset camera
        </Button>
      </Buttons>
      <Controls>
        <Slider
          label="Camera azimuth"
          min={-65}
          max={15}
          step={1}
          value={azimuth}
          onChange={setAzimuth}
          format={(v) => `${v.toFixed(0)}°`}
        />
        <Slider
          label="Camera elevation"
          min={8}
          max={45}
          step={1}
          value={elevation}
          onChange={setElevation}
          format={(v) => `${v.toFixed(0)}°`}
        />
      </Controls>
      <p className={styles.note}>
        The trajectories occupy the vertical launch plane used by the paper’s 2D model. The 3D field
        supplies spatial context; it does not add a lateral-force model. Cloud mode draws 81 evenly
        spaced representatives from the full 1,767-point stress box.
      </p>
    </section>
  );
}
