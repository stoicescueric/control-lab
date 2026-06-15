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
  return (
    <div className={className}>
      <label className="mb-1.5 flex items-baseline justify-between text-[0.85rem] font-semibold text-[#c7d2e8]">
        <span>{label}</span>
        <span className="font-mono font-bold text-white">{format(value)}</span>
      </label>
      <input
        className="cl-range"
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
      />
    </div>
  );
}

export default Slider;
