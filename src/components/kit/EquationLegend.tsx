import type {ReactNode} from 'react';

interface EquationLegendItem {
  symbol: ReactNode;
  meaning: ReactNode;
  unit?: ReactNode;
}

interface EquationLegendProps {
  title?: ReactNode;
  items: EquationLegendItem[];
}

export function EquationLegend({title = 'Symbols in this equation', items}: EquationLegendProps) {
  return (
    <aside className="not-prose my-5 overflow-hidden rounded-xl border border-line bg-surface shadow-card">
      <div className="border-b border-line bg-surface-2 px-4 py-2.5 text-[0.78rem] font-bold uppercase tracking-wide text-ink-soft">
        {title}
      </div>
      <dl className="m-0 divide-y divide-line">
        {items.map((item, index) => (
          <div key={index} className="grid gap-1 px-4 py-3 sm:grid-cols-[minmax(5rem,8rem)_1fr_auto] sm:items-baseline sm:gap-4">
            <dt className="font-mono text-[1.02rem] font-semibold text-brand">{item.symbol}</dt>
            <dd className="m-0 text-[0.98rem] leading-relaxed text-ink">{item.meaning}</dd>
            {item.unit ? <dd className="m-0 font-mono text-[0.84rem] text-ink-soft">{item.unit}</dd> : <span />}
          </div>
        ))}
      </dl>
    </aside>
  );
}

export default EquationLegend;
