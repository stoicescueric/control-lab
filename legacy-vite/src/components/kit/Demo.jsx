/* The dark interactive-demo panel and its furniture.
   Use inside a lesson:

     <Demo title="PID altitude hold — drag the target!">
       <Stage split> ...canvases... </Stage>
       <Controls> <Slider .../> </Controls>
       <Buttons> <Button onClick=...>Reset</Button> </Buttons>
       <Readout items={[["Altitude","1.2 m"]]} />
     </Demo>
*/

export function Demo({ title, pill = "Live demo", children, className = "" }) {
  return (
    <div className={`my-7 rounded-2xl bg-panel p-[18px] text-panel-ink shadow-pop ${className}`}>
      {(title || pill) && (
        <div className="mb-3.5 flex flex-wrap items-center gap-2.5 px-1 text-[1.02rem] font-bold text-white">
          {pill && (
            <span className="rounded-full bg-white/10 px-2.5 py-[3px] text-[0.68rem] font-bold uppercase tracking-wide text-[#cfe0ff]">
              {pill}
            </span>
          )}
          {title}
        </div>
      )}
      {children}
    </div>
  );
}

/* Lay canvases side by side on wide screens, stacked on narrow. */
export function Stage({ split = false, children, className = "" }) {
  return (
    <div className={`grid gap-3.5 ${split ? "md:grid-cols-2" : ""} ${className}`}>
      {children}
    </div>
  );
}

/* Responsive grid of sliders. */
export function Controls({ children, className = "" }) {
  return (
    <div
      className={`mt-4 grid gap-x-[22px] gap-y-3.5 [grid-template-columns:repeat(auto-fit,minmax(210px,1fr))] ${className}`}
    >
      {children}
    </div>
  );
}

/* Row of action buttons. */
export function Buttons({ children, className = "" }) {
  return <div className={`mt-4 flex flex-wrap gap-2 ${className}`}>{children}</div>;
}

export function Button({ primary = false, active = false, className = "", ...rest }) {
  const tone = primary
    ? "bg-brand border-brand text-white hover:bg-brand-dk"
    : active
      ? "bg-teal border-teal text-[#042b27]"
      : "bg-white/10 border-white/20 text-[#eaf0ff] hover:bg-white/20";
  return (
    <button
      type="button"
      className={`cursor-pointer rounded-[9px] border px-3.5 py-2 text-[0.85rem] font-semibold transition-colors ${tone} ${className}`}
      {...rest}
    />
  );
}

/* Monospace readout row: items = [[label, value], ...]. */
export function Readout({ items = [], className = "" }) {
  return (
    <div
      className={`mt-2 flex flex-wrap gap-[18px] px-1 font-mono text-[0.82rem] text-[#aab8d6] ${className}`}
    >
      {items.map(([label, value], i) => (
        <span key={i}>
          {label}: <b className="text-white">{value}</b>
        </span>
      ))}
    </div>
  );
}

/* Colour legend under a plot: items = [{color, label, dot?}]. */
export function Legend({ items = [], className = "" }) {
  return (
    <div className={`mx-1 mt-3 flex flex-wrap gap-3.5 text-[0.82rem] text-[#b9c5de] ${className}`}>
      {items.map((it, i) => (
        <span key={i} className="inline-flex items-center gap-2">
          <i
            className="inline-block"
            style={
              it.dot
                ? { width: 9, height: 9, borderRadius: "50%", background: it.color }
                : { width: 16, height: 4, borderRadius: 2, background: it.color }
            }
          />
          {it.label}
        </span>
      ))}
    </div>
  );
}

/* A canvas styled for the demo panel. Forward the ref so demos can grab it. */
export function DemoCanvas({ ref, className = "", ...rest }) {
  return (
    <canvas
      ref={ref}
      className={`block w-full rounded-xl bg-[#0b1120] ${className}`}
      {...rest}
    />
  );
}
