/* Shrinks display equations to fit the content column, so no lesson needs
   horizontal dragging to read math — KaTeX cannot line-break an equation,
   so we scale its font instead. Runs after every route render, on resize,
   and once fonts finish loading. Desktop columns rarely trigger it; phone
   columns often do. Below the floor ratio the CSS overflow-x fallback in
   custom.css still applies, so extreme equations stay reachable. */

import ExecutionEnvironment from '@docusaurus/ExecutionEnvironment';

const FLOOR = 0.55;

function fitOne(el: HTMLElement) {
  el.style.fontSize = ''; // reset to the stylesheet size before measuring
  if (el.scrollWidth <= el.clientWidth + 1) return;
  const base = parseFloat(getComputedStyle(el).fontSize);
  const ratio = Math.max(FLOOR, (el.clientWidth - 2) / el.scrollWidth);
  el.style.fontSize = `${(base * ratio).toFixed(2)}px`;
}

function fitAll() {
  document.querySelectorAll<HTMLElement>('.katex-display').forEach(fitOne);
}

let timer: number | undefined;
function schedule() {
  if (timer) window.clearTimeout(timer);
  timer = window.setTimeout(fitAll, 120);
}

if (ExecutionEnvironment.canUseDOM) {
  window.addEventListener('resize', schedule);
  document.fonts?.ready?.then(fitAll).catch(() => {});
}

export function onRouteDidUpdate(): void {
  if (!ExecutionEnvironment.canUseDOM) return;
  window.requestAnimationFrame(fitAll);
  window.setTimeout(fitAll, 400); // once more after fonts/layout settle
}
