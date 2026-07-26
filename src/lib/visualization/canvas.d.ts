import type {MutableRefObject, RefObject} from 'react';
import type {Plot, PlotOptions} from './plot.js';

export function useDprCanvas(
  ref: RefObject<HTMLCanvasElement | null>,
  height: number,
): MutableRefObject<{w: number; h: number}>;

export function useRaf(
  callback: (dt: number, now: number) => void,
  targetRef?: RefObject<Element | null>,
): void;

export function usePlot(
  canvasRef: RefObject<HTMLCanvasElement | null>,
  options: PlotOptions,
): MutableRefObject<Plot | null>;
