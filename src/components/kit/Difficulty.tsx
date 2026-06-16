/* A small difficulty badge placed right under a lesson's title:
     <Difficulty level="Easy" />   <Difficulty level="Medium" />   <Difficulty level="Hard" />
   Easy = green, Medium = amber, Hard = rose, off the shared theme tokens. */

type Level = 'Easy' | 'Medium' | 'Hard';

const TONE: Record<Level, string> = {
  Easy: 'text-green border-green/40 bg-green/10',
  Medium: 'text-amber border-amber/40 bg-amber/10',
  Hard: 'text-rose border-rose/40 bg-rose/10',
};

export function Difficulty({level = 'Medium'}: {level?: Level}) {
  const tone = TONE[level] ?? TONE.Medium;
  return (
    <p className="not-prose -mt-2 mb-7 flex items-center gap-2">
      <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-bold ${tone}`}>
        <span className="inline-block h-2 w-2 rounded-full bg-current opacity-80" />
        {level}
      </span>
      <span className="text-sm text-ink-faint">difficulty</span>
    </p>
  );
}

export default Difficulty;
