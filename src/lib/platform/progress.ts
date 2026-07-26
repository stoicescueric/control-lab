/* Lesson-progress store: which docs the reader marked complete, plus the last
   page they visited. Pure localStorage + events (framework-free, SSR-safe) —
   React components subscribe via `subscribe` and re-read on change. Storage is
   per-browser; there is no backend. */

export type LastVisited = {id: string; title: string; path: string};

type Data = {completed: Record<string, true>; challenges?: Record<string, true>; last?: LastVisited};

const KEY = 'cl-progress-v1';
const EVT = 'cl-progress-change';

function read(): Data {
  if (typeof window === 'undefined') return {completed: {}};
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return {completed: {}};
    const parsed = JSON.parse(raw) as Data;
    return parsed && typeof parsed === 'object' && parsed.completed ? parsed : {completed: {}};
  } catch {
    return {completed: {}};
  }
}

function write(data: Data) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    return; // storage full / blocked — degrade silently
  }
  window.dispatchEvent(new Event(EVT));
}

export function isComplete(id: string): boolean {
  return Boolean(read().completed[id]);
}

export function completedCount(): number {
  return Object.keys(read().completed).length;
}

export function toggleComplete(id: string) {
  const data = read();
  if (data.completed[id]) delete data.completed[id];
  else data.completed[id] = true;
  write(data);
}

export function isChallengePassed(id: string): boolean {
  return Boolean(read().challenges?.[id]);
}

export function passChallenge(id: string) {
  const data = read();
  if (data.challenges?.[id]) return;
  data.challenges = {...data.challenges, [id]: true};
  write(data);
}

export function getLast(): LastVisited | undefined {
  return read().last;
}

/** Record the doc the reader is on, for the homepage "continue" card. */
export function recordVisit(last: LastVisited) {
  const data = read();
  if (data.last?.id === last.id) return;
  data.last = last;
  write(data);
}

/** Re-run `cb` whenever progress changes (this tab or another). */
export function subscribe(cb: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener(EVT, cb);
  window.addEventListener('storage', cb);
  return () => {
    window.removeEventListener(EVT, cb);
    window.removeEventListener('storage', cb);
  };
}
