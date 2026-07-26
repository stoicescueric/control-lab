/* Wraps sidebar doc links to tag completed lessons with a `cl-done` class
   (styled in custom.css as a trailing green check). Progress lives in
   src/lib/platform/progress; this re-renders when it changes. */

import {useEffect, useState} from 'react';
import Link from '@theme-original/DocSidebarItem/Link';
import type LinkType from '@theme/DocSidebarItem/Link';
import type {WrapperProps} from '@docusaurus/types';
import {isComplete, subscribe} from '@site/src/lib/platform/progress';

type Props = WrapperProps<typeof LinkType>;

export default function LinkWrapper(props: Props) {
  const docId = props.item.docId;
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!docId) return undefined;
    setDone(isComplete(docId));
    return subscribe(() => setDone(isComplete(docId)));
  }, [docId]);

  const item = done
    ? {...props.item, className: [props.item.className, 'cl-done'].filter(Boolean).join(' ')}
    : props.item;

  return <Link {...props} item={item} />;
}
