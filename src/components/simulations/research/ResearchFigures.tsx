import type {ReactNode} from 'react';
import styles from './Research.module.css';

export const colors = {
  flight: '#7b9cff',
  vacuum: '#a6b4cc',
  target: '#ffc66d',
  good: '#69d8ba',
  miss: '#ef91ac',
  line: '#3d506f',
};
export function ResearchFigure({
  title,
  caption,
  children,
}: {
  title: string;
  caption: string;
  children: ReactNode;
}) {
  return (
    <figure className={styles.figure}>
      {children}
      <figcaption>
        <strong>{title}</strong>
        {caption}
      </figcaption>
    </figure>
  );
}
export function Workflow() {
  const steps = [
    ['Predict flight', 'Speed and angle become a descending rim crossing.'],
    ['Test the opening', 'The ball’s center must clear both lips.'],
    ['Compare nearby shots', 'Choose the command with the most tolerance.'],
    ['Calibrate the launcher', 'Distance becomes wheel, hood, and flight-time settings.'],
    ['Compensate motion', 'Velocity and flight time shift a virtual target.'],
    ['Compare workflows', 'Balance model assumptions against physical trial count.'],
  ];
  return (
    <ol className={styles.pipeline}>
      {steps.map(([title, body], i) => (
        <li key={title}>
          <span>0{i + 1}</span>
          <b>{title}</b>
          <p>{body}</p>
        </li>
      ))}
    </ol>
  );
}
export function EntryGeometry() {
  return (
    <ResearchFigure
      title="The center needs room on both sides"
      caption="Side view, enlarged around the goal. The physical opening is 46.5 cm deep. Subtract the 12.7 cm ball diameter to leave a 33.8 cm interval for its center. Distance d is measured to the front lip.">
      <svg
        viewBox="0 0 520 285"
        role="img"
        aria-label="Goal cross-section: 46.5 cm opening, 12.7 cm ball, and 33.8 cm center-entry interval">
        <path d="M60 125H95V230H425V125H460" stroke={colors.line} strokeWidth="5" fill="none" />
        <path
          d="M120 30 Q225 15 282 126"
          fill="none"
          stroke={colors.flight}
          strokeWidth="3"
          strokeDasharray="7 5"
        />
        <path d="M271 110L282 126L282 105" fill="none" stroke={colors.flight} strokeWidth="3" />
        <line x1="95" x2="425" y1="126" y2="126" stroke={colors.vacuum} strokeDasharray="4 4" />
        <line x1="140" x2="380" y1="126" y2="126" stroke={colors.good} strokeWidth="7" />
        <circle cx="282" cy="126" r="45" fill="#7b9cff22" stroke={colors.flight} strokeWidth="2" />
        <circle cx="282" cy="126" r="4" fill="white" />
        <line x1="140" x2="380" y1="187" y2="187" stroke={colors.good} />
        <path d="M140 180V194M380 180V194" stroke={colors.good} />
        <text x="260" y="211" textAnchor="middle">
          33.8 cm for the center
        </text>
        <text x="95" y="111" textAnchor="end">
          front lip
        </text>
        <text x="425" y="111">
          rear lip
        </text>
        <text x="260" y="262" textAnchor="middle">
          46.5 cm opening depth
        </text>
        <text x="332" y="61">
          ball Ø 12.7 cm
        </text>
        <path d="M352 67L317 99" stroke={colors.line} />
        <text x="25" y="27">
          Descending entry
        </text>
      </svg>
    </ResearchFigure>
  );
}
export function LauncherMechanism() {
  return (
    <ResearchFigure
      title="A wheel command is not an exit speed"
      caption="Schematic of the contact region. Slip and compression make the ball slower than the wheel surface. The pilot estimate η = 0.259 is a velocity ratio averaged across seven different launch configurations.">
      <svg
        viewBox="0 0 520 290"
        role="img"
        aria-label="Launcher contact schematic with flywheel radius, hood, projectile, and outgoing velocity">
        <circle cx="140" cy="165" r="66" stroke={colors.line} strokeWidth="16" fill="#17243a" />
        <circle cx="140" cy="165" r="8" fill={colors.vacuum} />
        <line x1="140" x2="190" y1="165" y2="125" stroke={colors.target} strokeWidth="2" />
        <text x="40" y="264">
          wheel radius: 6.92 cm
        </text>
        <path d="M180 76Q244 47 325 90" fill="none" stroke={colors.vacuum} strokeWidth="12" />
        <text x="273" y="40">
          adjustable hood
        </text>
        <line x1="315" x2="310" y1="47" y2="78" stroke={colors.line} />
        <circle cx="226" cy="107" r="27" fill="#7b9cff44" stroke={colors.flight} strokeWidth="2" />
        <circle cx="220" cy="97" r="4" fill={colors.flight} />
        <circle cx="238" cy="108" r="4" fill={colors.flight} />
        <circle cx="219" cy="118" r="4" fill={colors.flight} />
        <path
          d="M258 122L402 164L385 149M402 164L381 167"
          fill="none"
          stroke={colors.good}
          strokeWidth="3"
        />
        <text x="334" y="197">
          ball exit velocity
        </text>
        <path
          d="M99 104Q59 133 83 185L68 176M83 185L85 165"
          fill="none"
          stroke={colors.target}
          strokeWidth="3"
        />
        <text x="23" y="48">
          wheel surface speed
        </text>
        <text x="245" y="257">
          measure the transfer
        </text>
      </svg>
    </ResearchFigure>
  );
}
