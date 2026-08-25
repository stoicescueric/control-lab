import type {CSSProperties} from 'react';

/* A labelled range slider for the dark demo panels. Controlled: pass value +
   onChange. */

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  format?: (value: number) => string | number;
  className?: string;
}

export function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  format = (v) => v,
  className = '',
}: SliderProps) {
  // Drives the filled portion of the track (see `.cl-range` in custom.css), so
  // the control shows its value position and not just the thumb's location.
  const fill = max === min ? 0 : ((value - min) / (max - min)) * 100;

  return (
    <div className={className}>
      <label className="mb-1.5 flex items-baseline justify-between text-[0.85rem] font-semibold text-[#c7d2e8]">
        <span>{label}</span>
        <span className="font-mono font-bold text-white">{format(value)}</span>
      </label>
      <input
        className="cl-range"
        style={{'--cl-range-fill': `${fill}%`} as CSSProperties}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-label={label}
        aria-valuetext={String(format(value))}
        onChange={(e) => onChange(parseFloat(e.target.value))}
      />
    </div>
  );
}

export default Slider;
