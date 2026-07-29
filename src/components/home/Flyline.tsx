/**
 * Decorative spline motifs for the home page. The curves are shaped like the
 * step responses and spline segments the curriculum teaches, so the ornament
 * stays on-subject. All exports are purely decorative: aria-hidden, no
 * pointer events, no JS logic.
 */

import clsx from 'clsx';

/** Full-bleed hero background: three settling-response curves that draw in. */
export function FlylineSweep() {
  const paths = [
    {d: 'M -60 620 C 300 610, 480 210, 780 190 S 1300 175, 1520 180', width: 1.5, opacity: 1},
    {d: 'M -60 656 C 300 646, 480 246, 780 226 S 1300 211, 1520 216', width: 1.25, opacity: 0.55},
    {d: 'M -60 700 C 300 690, 480 290, 780 270 S 1300 255, 1520 260', width: 1, opacity: 0.3},
  ];

  return (
    <div className="pointer-events-none absolute inset-0 z-0" aria-hidden="true">
      <svg
        viewBox="0 0 1440 720"
        preserveAspectRatio="xMidYMid slice"
        className="h-full w-full text-brand/30 dark:text-brand-dk/25">
        {paths.map((path) => (
          <path
            key={path.d}
            d={path.d}
            fill="none"
            stroke="currentColor"
            strokeWidth={path.width}
            opacity={path.opacity}
            vectorEffect="non-scaling-stroke"
            pathLength={1}
            className="cl-flyline"
          />
        ))}
      </svg>
    </div>
  );
}

/**
 * Curved seam between two homepage sections. Render it on the outgoing
 * section's background and give it the incoming section's color, e.g.
 * `<CurveDivider className="bg-bg text-panel" />`. Token classes keep both
 * fills theme-correct automatically.
 */
export function CurveDivider({className, flip = false}: {className?: string; flip?: boolean}) {
  return (
    <div className={clsx('pointer-events-none', className)} aria-hidden="true">
      <svg
        viewBox="0 0 1440 96"
        preserveAspectRatio="none"
        className={clsx('block h-[clamp(40px,7vw,96px)] w-full', flip && '-scale-y-100')}>
        <path
          d="M0 64 C 240 20, 480 92, 760 56 C 1040 20, 1240 44, 1440 30 L 1440 96 L 0 96 Z"
          fill="currentColor"
        />
      </svg>
    </div>
  );
}

/** Small inline spline stroke used beside a section kicker label. */
export function FlylineAccent({className}: {className?: string}) {
  return (
    <svg
      viewBox="0 0 120 24"
      className={clsx('pointer-events-none h-4 w-20 text-brand/40', className)}
      aria-hidden="true">
      <path
        d="M 2 20 C 30 20, 40 5, 70 4 S 112 6, 118 6"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
