import {useRef, useState} from 'react';
import {Demo, Buttons, Button, Readout, Legend} from '@site/src/components/kit/Demo';

const W = 640;
const H = 360;
const FIELD_WIDTH_IN = 144;
const IN_PER_PX = FIELD_WIDTH_IN / W;

type Point = {x: number; y: number};
type Projection = {
  point: Point;
  tangent: Point;
  normal: Point;
  t: number;
  distanceIn: number;
  signedErrorIn: number;
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const INITIAL_POINTS: Point[] = [
  {x: 70, y: 275},
  {x: 205, y: 65},
  {x: 440, y: 320},
  {x: 580, y: 95},
];

function bezier(points: Point[], t: number): Point {
  const u = 1 - t;
  const a = u * u * u;
  const b = 3 * u * u * t;
  const c = 3 * u * t * t;
  const d = t * t * t;
  return {
    x: a * points[0].x + b * points[1].x + c * points[2].x + d * points[3].x,
    y: a * points[0].y + b * points[1].y + c * points[2].y + d * points[3].y,
  };
}

function unitTangent(points: Point[], t: number): Point {
  const a = bezier(points, clamp(t - 0.004, 0, 1));
  const b = bezier(points, clamp(t + 0.004, 0, 1));
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const mag = Math.hypot(dx, dy) || 1;
  return {x: dx / mag, y: dy / mag};
}

function project(points: Point[], robot: Point): Projection {
  let bestT = 0;
  let bestPoint = bezier(points, 0);
  let bestDistance = Infinity;

  for (let i = 0; i <= 260; i++) {
    const t = i / 260;
    const point = bezier(points, t);
    const distance = (point.x - robot.x) ** 2 + (point.y - robot.y) ** 2;
    if (distance < bestDistance) {
      bestDistance = distance;
      bestT = t;
      bestPoint = point;
    }
  }

  const tangent = unitTangent(points, bestT);
  const normal = {x: -tangent.y, y: tangent.x};
  const rx = robot.x - bestPoint.x;
  const ry = robot.y - bestPoint.y;
  const signedErrorIn = (rx * normal.x + ry * normal.y) * IN_PER_PX;

  return {
    point: bestPoint,
    tangent,
    normal,
    t: bestT,
    distanceIn: Math.sqrt(bestDistance) * IN_PER_PX,
    signedErrorIn,
  };
}

function Arrow({
  from,
  dir,
  length,
  color,
  dashed = false,
}: {
  from: Point;
  dir: Point;
  length: number;
  color: string;
  dashed?: boolean;
}) {
  const to = {x: from.x + dir.x * length, y: from.y + dir.y * length};
  const side = {x: -dir.y, y: dir.x};
  const back = {x: to.x - dir.x * 9, y: to.y - dir.y * 9};
  return (
    <g>
      <line
        x1={from.x}
        y1={from.y}
        x2={to.x}
        y2={to.y}
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray={dashed ? '7 6' : undefined}
      />
      <path
        d={`M ${to.x} ${to.y} L ${back.x + side.x * 4.5} ${back.y + side.y * 4.5} L ${back.x - side.x * 4.5} ${back.y - side.y * 4.5} Z`}
        fill={color}
      />
    </g>
  );
}

export function PathProjection() {
  const svgRef = useRef<SVGSVGElement>(null);
  const drag = useRef<string | null>(null);
  const [points, setPoints] = useState<Point[]>(INITIAL_POINTS);
  const [robot, setRobot] = useState<Point>({x: 150, y: 145});

  const path = `M ${points[0].x} ${points[0].y} C ${points[1].x} ${points[1].y}, ${points[2].x} ${points[2].y}, ${points[3].x} ${points[3].y}`;
  const projection = project(points, robot);
  const errorVector = {
    x: robot.x - projection.point.x,
    y: robot.y - projection.point.y,
  };
  const errorMag = Math.hypot(errorVector.x, errorVector.y) || 1;
  const errorDir = {x: errorVector.x / errorMag, y: errorVector.y / errorMag};

  const toSvg = (event: React.PointerEvent): Point => {
    const rect = svgRef.current!.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) * W) / rect.width,
      y: ((event.clientY - rect.top) * H) / rect.height,
    };
  };

  const onMove = (event: React.PointerEvent) => {
    if (drag.current == null) return;
    const p = toSvg(event);
    const next = {x: clamp(p.x, 12, W - 12), y: clamp(p.y, 12, H - 12)};
    if (drag.current === 'robot') {
      setRobot(next);
      return;
    }
    const index = Number(drag.current);
    setPoints((prev) => prev.map((point, i) => (i === index ? next : point)));
  };

  return (
    <Demo title="Closest-point projection: drag the robot and watch psi(p) move">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="block h-auto w-full touch-none rounded-xl bg-[#0b1120]"
        role="img"
        aria-label="A cubic Bezier path with a draggable robot, closest projection point, tangent, normal, and distance error"
        onPointerMove={onMove}
        onPointerUp={() => (drag.current = null)}
        onPointerLeave={() => (drag.current = null)}>
        <path d={path} fill="none" stroke="#5ce08a" strokeWidth="4" strokeLinecap="round" />
        <polyline
          points={points.map((point) => `${point.x},${point.y}`).join(' ')}
          fill="none"
          stroke="#2a3656"
          strokeWidth="1.5"
          strokeDasharray="5 6"
        />

        <line
          x1={projection.point.x}
          y1={projection.point.y}
          x2={robot.x}
          y2={robot.y}
          stroke="#ff6f9c"
          strokeWidth="3"
          strokeDasharray="8 6"
          strokeLinecap="round"
        />
        <Arrow from={projection.point} dir={projection.tangent} length={56} color="#ffc24d" />
        <Arrow from={projection.point} dir={projection.normal} length={42} color="#6f8bff" dashed />

        <circle cx={projection.point.x} cy={projection.point.y} r="8" fill="#0b1120" stroke="#5ce08a" strokeWidth="3" />
        <text
          x={projection.point.x + 12}
          y={projection.point.y - 12}
          fontFamily="JetBrains Mono, monospace"
          fontSize="13"
          fill="#b8f7d0">
          phi(psi(p))
        </text>

        <circle
          cx={robot.x}
          cy={robot.y}
          r="12"
          fill="#ff6f9c"
          stroke="#fff"
          strokeWidth="2.5"
          style={{cursor: 'grab'}}
          onPointerDown={(event) => {
            drag.current = 'robot';
            (event.target as Element).setPointerCapture(event.pointerId);
          }}
        />
        <Arrow from={projection.point} dir={errorDir} length={Math.min(errorMag, 90)} color="#ff6f9c" dashed />

        {points.map((point, index) => (
          <circle
            key={index}
            cx={point.x}
            cy={point.y}
            r="8"
            fill="#16203a"
            stroke="#8ea2ff"
            strokeWidth="2.5"
            style={{cursor: 'grab'}}
            onPointerDown={(event) => {
              drag.current = String(index);
              (event.target as Element).setPointerCapture(event.pointerId);
            }}
          />
        ))}

        <text x="16" y="28" fontFamily="JetBrains Mono, monospace" fontSize="13" fill="#8294b8">
          drag the pink robot or blue Bezier handles
        </text>
      </svg>

      <Buttons>
        <Button onClick={() => setRobot({x: 150, y: 145})}>Reset robot</Button>
        <Button onClick={() => setPoints(INITIAL_POINTS)}>Reset path</Button>
        <Button onClick={() => setRobot({x: 440, y: 170})}>Disturb robot</Button>
      </Buttons>

      <Readout
        items={[
          ['psi(p)', projection.t.toFixed(3)],
          ['distance', `${projection.distanceIn.toFixed(1)} in`],
          ['signed error e', `${projection.signedErrorIn.toFixed(1)} in`],
          ['condition', 'error line is perpendicular to tangent at the closest point'],
        ]}
      />
      <Legend
        items={[
          {color: '#5ce08a', label: 'path phi(t)'},
          {color: '#ff6f9c', label: 'robot p and error vector'},
          {color: '#ffc24d', label: 'unit tangent T'},
          {color: '#6f8bff', label: 'unit normal N'},
          {color: '#8ea2ff', label: 'Bezier control handles', dot: true},
        ]}
      />
    </Demo>
  );
}

export default PathProjection;
