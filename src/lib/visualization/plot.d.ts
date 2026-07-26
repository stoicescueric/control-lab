export const PCOL: Record<string, string>;

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

export class Plot {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  o: Required<PlotOptions>;
  w: number;
  h: number;

  constructor(canvas: HTMLCanvasElement | string, opts?: PlotOptions);
  resize(): void;
  setX(min: number, max: number): void;
  setY(min: number, max: number): void;
  sx(x: number): number;
  sy(y: number): number;
  ix(px: number): number;
  iy(py: number): number;
  clear(): void;
  grid(): void;
  clip(fn: () => void): void;
  line(points: [number, number][], opts?: LineOptions): void;
  band(points: [number, number, number][], color: string): void;
  dots(points: [number, number][], opts?: DotOptions): void;
  dot(x: number, y: number, opts?: DotOptions): void;
  hline(y: number, opts?: LineOptions): void;
  vline(x: number, opts?: LineOptions): void;
  text(x: number, y: number, str: string, opts?: TextOptions): void;
}

export class Trace {
  maxLen: number;
  data: [number, number][];

  constructor(maxLen?: number);
  push(t: number, v: number): void;
  clear(): void;
  points(): [number, number][];
  last(): [number, number] | undefined;
}
