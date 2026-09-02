/* Reusable canvas plotting for the demos: a small 2-D line/scatter plotter with
   axes, gridlines and crisp HiDPI rendering, plus a Trace ring-buffer for
   scrolling time series. Ported from the legacy assets/js/plot.js.

   Difference from the legacy version: the constructor no longer attaches a
   window "resize" listener (that would leak across route changes in a SPA).
   Instead call `plot.resize()` yourself — the `usePlot` hook in
   lib/visualization/canvas.ts wires a ResizeObserver for you. */

export const PCOL = {
  grid: 'rgba(255,255,255,0.07)',
  grid2: 'rgba(255,255,255,0.14)',
  axis: 'rgba(255,255,255,0.35)',
  label: '#8294b8',
  brand: '#6f8bff',
  teal: '#2fd3c0',
  amber: '#ffc24d',
  rose: '#ff6f9c',
  green: '#5ce08a',
  violet: '#b08bff',
  white: '#e8eefc',
  faint: 'rgba(255,255,255,0.5)',
};

export interface PlotOptions {
  xmin?: number;
  xmax?: number;
  ymin?: number;
  ymax?: number;
  padL?: number;
  padR?: number;
  padT?: number;
  padB?: number;
  bg?: string;
  xLabel?: string;
  yLabel?: string;
  xTicks?: boolean;
  yTicks?: boolean;
  height?: number;
}

export interface LineOptions {
  color?: string;
  width?: number;
  dash?: number[];
  alpha?: number;
}

export interface DotOptions {
  color?: string;
  r?: number;
  ring?: string;
  ringW?: number;
  alpha?: number;
}

export interface TextOptions {
  color?: string;
  font?: string;
  align?: CanvasTextAlign;
  baseline?: CanvasTextBaseline;
}

/** [x, y] */
export type Point2 = [number, number];
/** [x, yLow, yHigh] */
export type Point3 = [number, number, number];

const DEFAULTS: Required<PlotOptions> = {
  xmin: 0,
  xmax: 1,
  ymin: 0,
  ymax: 1,
  padL: 44,
  padR: 14,
  padT: 12,
  padB: 28,
  bg: '#0b1120',
  xLabel: '',
  yLabel: '',
  xTicks: true,
  yTicks: true,
  height: 280,
};

function niceStep(range: number, target: number): number {
  const raw = range / target;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const norm = raw / mag;
  let step;
  if (norm < 1.5) step = 1;
  else if (norm < 3) step = 2;
  else if (norm < 7) step = 5;
  else step = 10;
  return step * mag;
}

function fmtNum(v: number): string {
  if (Math.abs(v) >= 1000) return v / 1000 + 'k';
  if (Math.abs(v) < 1e-9) return '0';
  const r = Math.round(v * 100) / 100;
  return String(r);
}

export class Plot {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  o: Required<PlotOptions>;
  w: number;
  h: number;

  constructor(canvas: HTMLCanvasElement | string, opts: PlotOptions = {}) {
    const element = typeof canvas === 'string' ? document.getElementById(canvas) : canvas;
    if (!(element instanceof HTMLCanvasElement)) {
      throw new Error(
        typeof canvas === 'string'
          ? `Plot: no <canvas> with id "${canvas}"`
          : 'Plot: expected an HTMLCanvasElement',
      );
    }
    const ctx = element.getContext('2d');
    if (!ctx) throw new Error('Plot: could not get a 2-D canvas context');

    this.canvas = element;
    this.ctx = ctx;
    this.o = {...DEFAULTS, ...opts};
    this.w = 0;
    this.h = this.o.height;
    this.resize();
  }

  resize(): void {
    const dpr = window.devicePixelRatio || 1;
    const cssW = this.canvas.clientWidth || this.canvas.parentElement?.clientWidth || 600;
    const cssH = this.o.height;
    this.canvas.style.height = cssH + 'px';
    this.canvas.width = Math.round(cssW * dpr);
    this.canvas.height = Math.round(cssH * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.w = cssW;
    this.h = cssH;
  }

  setX(min: number, max: number): void {
    this.o.xmin = min;
    this.o.xmax = max;
  }
  setY(min: number, max: number): void {
    this.o.ymin = min;
    this.o.ymax = max;
  }

  sx(x: number): number {
    const {xmin, xmax, padL} = this.o;
    const w = this.w - padL - this.o.padR;
    return padL + ((x - xmin) / (xmax - xmin)) * w;
  }
  sy(y: number): number {
    const {ymin, ymax, padT} = this.o;
    const h = this.h - padT - this.o.padB;
    return padT + (1 - (y - ymin) / (ymax - ymin)) * h;
  }
  ix(px: number): number {
    const {xmin, xmax, padL} = this.o;
    const w = this.w - padL - this.o.padR;
    return xmin + ((px - padL) / w) * (xmax - xmin);
  }
  iy(py: number): number {
    const {ymin, ymax, padT} = this.o;
    const h = this.h - padT - this.o.padB;
    return ymin + (1 - (py - padT) / h) * (ymax - ymin);
  }

  clear(): void {
    const c = this.ctx;
    c.fillStyle = this.o.bg;
    c.fillRect(0, 0, this.w, this.h);
  }

  grid(): void {
    const c = this.ctx,
      o = this.o;
    const x0 = this.sx(o.xmin),
      x1 = this.sx(o.xmax);
    const y0 = this.sy(o.ymin),
      y1 = this.sy(o.ymax);
    c.lineWidth = 1;
    c.font = '11px ui-monospace, monospace';
    c.fillStyle = PCOL.label;

    if (o.yTicks) {
      const step = niceStep(o.ymax - o.ymin, 4);
      const start = Math.ceil(o.ymin / step) * step;
      c.textAlign = 'right';
      c.textBaseline = 'middle';
      for (let v = start; v <= o.ymax + 1e-9; v += step) {
        const py = this.sy(v);
        c.strokeStyle = Math.abs(v) < 1e-9 ? PCOL.grid2 : PCOL.grid;
        c.beginPath();
        c.moveTo(x0, py);
        c.lineTo(x1, py);
        c.stroke();
        c.fillText(fmtNum(v), o.padL - 6, py);
      }
    }
    if (o.xTicks) {
      const step = niceStep(o.xmax - o.xmin, 6);
      const start = Math.ceil(o.xmin / step) * step;
      c.textAlign = 'center';
      c.textBaseline = 'top';
      for (let v = start; v <= o.xmax + 1e-9; v += step) {
        const px = this.sx(v);
        c.strokeStyle = Math.abs(v) < 1e-9 ? PCOL.grid2 : PCOL.grid;
        c.beginPath();
        c.moveTo(px, y1);
        c.lineTo(px, y0);
        c.stroke();
        c.fillText(fmtNum(v), px, this.h - o.padB + 6);
      }
    }
    c.strokeStyle = PCOL.axis;
    c.strokeRect(x0, y1, x1 - x0, y0 - y1);

    if (o.yLabel) {
      c.save();
      c.translate(12, (y0 + y1) / 2);
      c.rotate(-Math.PI / 2);
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillStyle = PCOL.label;
      c.fillText(o.yLabel, 0, 0);
      c.restore();
    }
    if (o.xLabel) {
      c.textAlign = 'center';
      c.textBaseline = 'bottom';
      c.fillStyle = PCOL.label;
      c.fillText(o.xLabel, (x0 + x1) / 2, this.h - 2);
    }
  }

  clip(fn: () => void): void {
    const c = this.ctx,
      o = this.o;
    c.save();
    c.beginPath();
    c.rect(o.padL, o.padT, this.w - o.padL - o.padR, this.h - o.padT - o.padB);
    c.clip();
    fn();
    c.restore();
  }

  /* pts: array of [x,y]. opts: {color,width,dash,alpha} */
  line(pts: readonly Point2[], opts: LineOptions = {}): void {
    if (!pts || pts.length < 2) return;
    const c = this.ctx;
    c.save();
    c.globalAlpha = opts.alpha ?? 1;
    c.strokeStyle = opts.color || PCOL.brand;
    c.lineWidth = opts.width || 2;
    c.lineJoin = 'round';
    c.lineCap = 'round';
    if (opts.dash) c.setLineDash(opts.dash);
    else c.setLineDash([]);
    c.beginPath();
    c.moveTo(this.sx(pts[0][0]), this.sy(pts[0][1]));
    for (let i = 1; i < pts.length; i++) c.lineTo(this.sx(pts[i][0]), this.sy(pts[i][1]));
    c.stroke();
    c.restore();
  }

  /* shaded band: pts = [[x, yLow, yHigh], ...] */
  band(pts: readonly Point3[], color: string): void {
    if (!pts || pts.length < 2) return;
    const c = this.ctx;
    c.save();
    c.fillStyle = color;
    c.beginPath();
    c.moveTo(this.sx(pts[0][0]), this.sy(pts[0][1]));
    for (let i = 1; i < pts.length; i++) c.lineTo(this.sx(pts[i][0]), this.sy(pts[i][1]));
    for (let i = pts.length - 1; i >= 0; i--) c.lineTo(this.sx(pts[i][0]), this.sy(pts[i][2]));
    c.closePath();
    c.fill();
    c.restore();
  }

  dots(pts: readonly Point2[], opts: DotOptions = {}): void {
    const c = this.ctx,
      r = opts.r || 2.5;
    c.save();
    c.fillStyle = opts.color || PCOL.amber;
    c.globalAlpha = opts.alpha ?? 1;
    for (const p of pts) {
      c.beginPath();
      c.arc(this.sx(p[0]), this.sy(p[1]), r, 0, 7);
      c.fill();
    }
    c.restore();
  }

  dot(x: number, y: number, opts: DotOptions = {}): void {
    const c = this.ctx;
    c.save();
    c.fillStyle = opts.color || PCOL.white;
    c.beginPath();
    c.arc(this.sx(x), this.sy(y), opts.r || 4, 0, 7);
    c.fill();
    if (opts.ring) {
      c.strokeStyle = opts.ring;
      c.lineWidth = opts.ringW || 2;
      c.stroke();
    }
    c.restore();
  }

  hline(y: number, opts: LineOptions = {}): void {
    const c = this.ctx;
    c.save();
    c.strokeStyle = opts.color || PCOL.faint;
    c.lineWidth = opts.width || 1.5;
    if (opts.dash) c.setLineDash(opts.dash);
    c.beginPath();
    c.moveTo(this.sx(this.o.xmin), this.sy(y));
    c.lineTo(this.sx(this.o.xmax), this.sy(y));
    c.stroke();
    c.restore();
  }

  vline(x: number, opts: LineOptions = {}): void {
    const c = this.ctx;
    c.save();
    c.strokeStyle = opts.color || PCOL.faint;
    c.lineWidth = opts.width || 1.5;
    if (opts.dash) c.setLineDash(opts.dash);
    c.beginPath();
    c.moveTo(this.sx(x), this.sy(this.o.ymin));
    c.lineTo(this.sx(x), this.sy(this.o.ymax));
    c.stroke();
    c.restore();
  }

  text(x: number, y: number, str: string, opts: TextOptions = {}): void {
    const c = this.ctx;
    c.save();
    c.fillStyle = opts.color || PCOL.white;
    c.font = opts.font || '12px ui-monospace, monospace';
    c.textAlign = opts.align || 'left';
    c.textBaseline = opts.baseline || 'alphabetic';
    c.fillText(str, this.sx(x), this.sy(y));
    c.restore();
  }
}

/* Ring buffer for scrolling time-series. push(t, v); points() -> [[t,v],...]. */
export class Trace {
  maxLen: number;
  data: Point2[];

  constructor(maxLen = 600) {
    this.maxLen = maxLen;
    this.data = [];
  }
  push(t: number, v: number): void {
    this.data.push([t, v]);
    if (this.data.length > this.maxLen) this.data.shift();
  }
  clear(): void {
    this.data = [];
  }
  points(): Point2[] {
    return this.data;
  }
  last(): Point2 | undefined {
    return this.data[this.data.length - 1];
  }
}
