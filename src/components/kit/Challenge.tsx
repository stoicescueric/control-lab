/* A sim-graded challenge panel. The sim owns the physics check and reports
   status/progress; this panel displays it, and persists a pass in the same
   local progress store as lesson completion, so a solved challenge stays
   solved across visits. */

import {useEffect, useState} from 'react';
import {isChallengePassed, passChallenge} from '@site/src/lib/platform/progress';

export type ChallengeStatus = 'idle' | 'holding' | 'passed';

export function ChallengeChip({
  id,
  label,
  status,
  progress = 0,
}: {
  id: string;
  label: string;
  status: ChallengeStatus;
  /** 0..1 while `holding` — how close the hold timer is to done. */
  progress?: number;
}) {
  const [stored, setStored] = useState(false);
  useEffect(() => setStored(isChallengePassed(id)), [id]);
  useEffect(() => {
    if (status === 'passed') {
      passChallenge(id);
      setStored(true);
    }
  }, [status, id]);

  const passed = stored || status === 'passed';

  return (
    <div
      className={`mt-4 flex flex-wrap items-center gap-3 rounded-[8px] border px-4 py-3 text-[0.86rem] transition-colors ${
        passed ? 'border-green/40 bg-green/10' : 'border-white/12 bg-white/[0.04]'
      }`}>
      <span
        aria-hidden="true"
        className={`rounded-[4px] border px-2 py-1 font-mono text-[0.66rem] font-semibold tracking-wide ${
          passed ? 'border-green/40 text-green' : 'border-white/20 text-[#c7d2e8]'
        }`}>
        {passed ? 'PASS' : 'TEST'}
      </span>
      <span className={`min-w-0 flex-1 font-medium ${passed ? 'text-green' : 'text-[#c7d2e8]'}`}>
        <span className="mr-2 font-bold uppercase tracking-wide text-[0.7rem] opacity-80">Challenge</span>
        {label}
      </span>
      {passed ? (
        <span className="shrink-0 rounded-[4px] bg-green/20 px-3 py-1 text-[0.75rem] font-bold text-green">
          Passed
        </span>
      ) : (
        <span className="flex shrink-0 items-center gap-2">
          <span className="h-2 w-24 overflow-hidden rounded-full bg-white/10">
            <span
              className="block h-full rounded-full bg-amber transition-[width] duration-200"
              style={{width: `${Math.round(Math.max(0, Math.min(1, progress)) * 100)}%`}}
            />
          </span>
          <span className="font-mono text-[0.72rem] text-[#8294b8]">
            {status === 'holding' ? 'holding…' : 'not yet'}
          </span>
        </span>
      )}
    </div>
  );
}

export default ChallengeChip;
