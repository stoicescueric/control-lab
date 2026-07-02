/* Wraps the standard doc footer to add lesson-progress UX on every doc page:
   a "mark complete" toggle (persisted per-browser via src/lib/progress) and a
   record of the last-visited lesson for the homepage "continue" card. */

import {useEffect, useState} from 'react';
import Footer from '@theme-original/DocItem/Footer';
import type FooterType from '@theme/DocItem/Footer';
import type {WrapperProps} from '@docusaurus/types';
import {useDoc} from '@docusaurus/plugin-content-docs/client';
import {isComplete, recordVisit, subscribe, toggleComplete} from '@site/src/lib/progress';

type Props = WrapperProps<typeof FooterType>;

export default function FooterWrapper(props: Props) {
  const {metadata} = useDoc();
  const {id, title, permalink} = metadata;
  const [done, setDone] = useState(false);

  useEffect(() => {
    setDone(isComplete(id));
    recordVisit({id, title, path: permalink});
    return subscribe(() => setDone(isComplete(id)));
  }, [id, title, permalink]);

  return (
    <>
      <div className="mt-10 mb-2 flex justify-center border-t border-line pt-6">
        <button
          type="button"
          onClick={() => toggleComplete(id)}
          aria-pressed={done}
          className={`inline-flex cursor-pointer items-center gap-2 rounded-full border px-5 py-2.5 text-[0.9rem] font-semibold transition-colors ${
            done
              ? 'border-green/40 bg-green/10 text-green'
              : 'border-line bg-surface text-ink-soft hover:border-brand/40 hover:text-brand'
          }`}>
          <span
            aria-hidden="true"
            className={`grid h-5 w-5 place-items-center rounded-full border text-[0.7rem] font-bold ${
              done ? 'border-green bg-green text-white' : 'border-ink-faint/50 text-transparent'
            }`}>
            ✓
          </span>
          {done ? 'Lesson completed — tap to undo' : 'Mark lesson as complete'}
        </button>
      </div>
      <Footer {...props} />
    </>
  );
}
