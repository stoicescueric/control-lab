import {useMemo, useState, type PointerEvent} from 'react';

import {Button, Buttons, Demo, Legend, Readout} from '../kit/Demo';

type Point = {
  x: number;
  y: number;
};

type Solution = {
  shoulder: number;
  elbow: number;
  elbowPoint: Point;
  wristPoint: Point;
  radius: number;
  reachable: boolean;
  cosElbow: number;
};

const WIDTH = 660;
const HEIGHT = 390;
const ORIGIN: Point = {x: 310, y: 305};
const LINK_1 = 125;
const LINK_2 = 100;
const UNITS_PER_PIXEL = 0.1;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function toRobot(svgPoint: Point): Point {
  return {
    x: svgPoint.x - ORIGIN.x,
    y: ORIGIN.y - svgPoint.y,
  };
}

function toSvg(robotPoint: Point): Point {
  return {
    x: ORIGIN.x + robotPoint.x,
    y: ORIGIN.y - robotPoint.y,
  };
}

function solveTwoLink(targetSvg: Point, elbowUp: boolean): Solution {
  const target = toRobot(targetSvg);
  const radius = Math.hypot(target.x, target.y);
  const minReach = Math.abs(LINK_1 - LINK_2);
  const maxReach = LINK_1 + LINK_2;
  const reachable = radius >= minReach && radius <= maxReach;

  const c2Raw =
    (radius * radius - LINK_1 * LINK_1 - LINK_2 * LINK_2) / (2 * LINK_1 * LINK_2);
  const cosElbow = clamp(c2Raw, -1, 1);
  const sinElbowMagnitude = Math.sqrt(Math.max(0, 1 - cosElbow * cosElbow));
  const sinElbow = elbowUp ? sinElbowMagnitude : -sinElbowMagnitude;

  const elbow = Math.atan2(sinElbow, cosElbow);
  const shoulder =
    Math.atan2(target.y, target.x) -
    Math.atan2(LINK_2 * sinElbow, LINK_1 + LINK_2 * cosElbow);

  const elbowRobot = {
    x: LINK_1 * Math.cos(shoulder),
    y: LINK_1 * Math.sin(shoulder),
  };
  const wristRobot = {
    x: elbowRobot.x + LINK_2 * Math.cos(shoulder + elbow),
    y: elbowRobot.y + LINK_2 * Math.sin(shoulder + elbow),
  };

  return {
    shoulder,
    elbow,
    elbowPoint: toSvg(elbowRobot),
    wristPoint: toSvg(wristRobot),
    radius,
    reachable,
    cosElbow,
  };
}

function formatDeg(rad: number): string {
  return `${Math.round((rad * 180) / Math.PI)} deg`;
}

function formatUnits(px: number): string {
  return `${(px * UNITS_PER_PIXEL).toFixed(1)} u`;
}

function pointerToSvgPoint(event: PointerEvent<SVGSVGElement>): Point {
  const rect = event.currentTarget.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) / rect.width) * WIDTH,
    y: ((event.clientY - rect.top) / rect.height) * HEIGHT,
  };
}

export default function InverseKinematicsArm() {
  const [target, setTarget] = useState<Point>({x: 450, y: 190});
  const [elbowUp, setElbowUp] = useState(true);
  const [dragging, setDragging] = useState(false);

  const solution = useMemo(() => solveTwoLink(target, elbowUp), [target, elbowUp]);
  const targetRobot = useMemo(() => toRobot(target), [target]);

  function moveTarget(event: PointerEvent<SVGSVGElement>) {
    if (!dragging) {
      return;
    }
    const next = pointerToSvgPoint(event);
    setTarget({
      x: clamp(next.x, 45, WIDTH - 35),
      y: clamp(next.y, 45, HEIGHT - 35),
    });
  }

  function startDrag(event: PointerEvent<SVGSVGElement>) {
    setDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
    const next = pointerToSvgPoint(event);
    setTarget({
      x: clamp(next.x, 45, WIDTH - 35),
      y: clamp(next.y, 45, HEIGHT - 35),
    });
  }

  function stopDrag(event: PointerEvent<SVGSVGElement>) {
    setDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  return (
    <Demo title="Inverse kinematics - drag the claw target">
      <svg
        role="img"
        aria-label="Interactive two-link inverse-kinematics arm"
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="block w-full rounded-[8px] bg-[#0b1120]"
        onPointerDown={startDrag}
        onPointerMove={moveTarget}
        onPointerUp={stopDrag}
        onPointerLeave={() => setDragging(false)}>
        <defs>
          <pattern id="ik-grid" width="24" height="24" patternUnits="userSpaceOnUse">
            <path d="M 24 0 L 0 0 0 24" fill="none" stroke="#1f2a44" strokeWidth="1" />
          </pattern>
          <filter id="ik-glow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <rect width={WIDTH} height={HEIGHT} fill="url(#ik-grid)" opacity="0.72" />

        <line x1={45} y1={ORIGIN.y} x2={WIDTH - 35} y2={ORIGIN.y} stroke="#32415f" />
        <line x1={ORIGIN.x} y1={HEIGHT - 35} x2={ORIGIN.x} y2={45} stroke="#32415f" />
        <text x={WIDTH - 75} y={ORIGIN.y - 10} fill="#8798bd" fontSize="13">
          +x
        </text>
        <text x={ORIGIN.x + 10} y={58} fill="#8798bd" fontSize="13">
          +y
        </text>

        <circle
          cx={ORIGIN.x}
          cy={ORIGIN.y}
          r={LINK_1 + LINK_2}
          fill="#2563eb"
          opacity="0.08"
          stroke="#3b82f6"
          strokeWidth="2"
          strokeDasharray="8 8"
        />
        <circle
          cx={ORIGIN.x}
          cy={ORIGIN.y}
          r={Math.abs(LINK_1 - LINK_2)}
          fill="#f59e0b"
          opacity="0.12"
          stroke="#f59e0b"
          strokeWidth="2"
          strokeDasharray="5 7"
        />

        <line
          x1={ORIGIN.x}
          y1={ORIGIN.y}
          x2={target.x}
          y2={target.y}
          stroke={solution.reachable ? '#64748b' : '#fb7185'}
          strokeWidth="2"
          strokeDasharray="4 6"
        />

        <line
          x1={ORIGIN.x}
          y1={ORIGIN.y}
          x2={solution.elbowPoint.x}
          y2={solution.elbowPoint.y}
          stroke="#60a5fa"
          strokeWidth="15"
          strokeLinecap="round"
        />
        <line
          x1={solution.elbowPoint.x}
          y1={solution.elbowPoint.y}
          x2={solution.wristPoint.x}
          y2={solution.wristPoint.y}
          stroke="#2dd4bf"
          strokeWidth="13"
          strokeLinecap="round"
        />

        <circle cx={ORIGIN.x} cy={ORIGIN.y} r="13" fill="#eaf0ff" />
        <circle cx={solution.elbowPoint.x} cy={solution.elbowPoint.y} r="11" fill="#eaf0ff" />
        <circle cx={solution.wristPoint.x} cy={solution.wristPoint.y} r="9" fill="#eaf0ff" />

        <circle
          cx={target.x}
          cy={target.y}
          r="13"
          fill={solution.reachable ? '#f97316' : '#fb7185'}
          stroke="#fff7ed"
          strokeWidth="3"
          filter="url(#ik-glow)"
        />
        <text x={target.x + 17} y={target.y - 16} fill="#f8fafc" fontSize="13" fontWeight="700">
          target
        </text>

        {!solution.reachable && (
          <text x={34} y={38} fill="#fb7185" fontSize="14" fontWeight="700">
            Target is outside the reachable workspace. The math clamps to the nearest angle.
          </text>
        )}
      </svg>

      <Buttons>
        <Button active={elbowUp} onClick={() => setElbowUp(true)}>
          Elbow up
        </Button>
        <Button active={!elbowUp} onClick={() => setElbowUp(false)}>
          Elbow down
        </Button>
        <Button onClick={() => setTarget({x: 450, y: 190})}>Reset target</Button>
        <Button onClick={() => setTarget({x: 570, y: 78})}>Unreachable target</Button>
      </Buttons>

      <Readout
        items={[
          ['x', formatUnits(targetRobot.x)],
          ['y', formatUnits(targetRobot.y)],
          ['r', formatUnits(solution.radius)],
          ['theta1', formatDeg(solution.shoulder)],
          ['theta2', formatDeg(solution.elbow)],
          ['reachable', solution.reachable ? 'yes' : 'no'],
        ]}
      />

      <Legend
        items={[
          {color: '#60a5fa', label: 'shoulder link'},
          {color: '#2dd4bf', label: 'elbow link'},
          {color: '#f97316', label: 'desired claw position', dot: true},
          {color: '#3b82f6', label: 'reachable workspace'},
        ]}
      />
    </Demo>
  );
}
