import type {ReactNode} from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import Heading from '@theme/Heading';
import type {Props} from '@theme/NotFound/Content';

/* Docusaurus ships a NotFound page that tells the reader to contact whoever
   linked them. On a curriculum announced to a community that trades links in
   Discord threads and forum posts, a stale URL is a routine event and the
   reader is the one person who cannot fix it. This override says what happened
   and puts the curriculum one click away instead. */

interface Destination {
  kind: string;
  title: string;
  description: string;
  to: string;
}

const DESTINATIONS: Destination[] = [
  {
    kind: 'Preface',
    title: 'Why Math Matters',
    description:
      'The preface. Calculus, linear algebra, differential equations, and state-space models, built from robotics examples.',
    to: '/docs/preface/why-math-matters',
  },
  {
    kind: 'Module 1',
    title: 'Start of the curriculum',
    description:
      'Software architecture and loop optimization, then motors, estimation, path following, and state-space control.',
    to: '/docs/software-architecture',
  },
  {
    kind: 'Reference',
    title: 'References & Resources',
    description:
      'The papers, textbooks, and library sources the lessons cite, with links to the originals.',
    to: '/docs/references',
  },
  {
    kind: 'Reference',
    title: 'Notation',
    description:
      'The symbols, units, and type names the lessons hold constant, including Vector2d, Pose2d, and PoseSample.',
    to: '/docs/notation',
  },
];

export default function NotFoundContent({className}: Props): ReactNode {
  return (
    <main className={clsx('container margin-vert--xl', className)}>
      <div className="mx-auto max-w-3xl px-1">
        <Heading
          as="h1"
          className="m-0 text-[clamp(2rem,4vw,2.9rem)] font-extrabold leading-[1.05] tracking-[-0.03em] text-ink">
          That page is not here.
        </Heading>
        <p className="m-0 mt-5 text-lg leading-relaxed text-ink-soft">
          Nothing on Control Lab matches this address. Lessons move between modules as the
          curriculum is reorganized, so a bookmark or a shared link can outlive the page it points
          to.
        </p>
        <p className="m-0 mt-4 leading-relaxed text-ink-soft">
          Search the full text of every lesson from the navigation bar, or pick up the curriculum at
          one of these:
        </p>

        <div className="mt-10 border-b border-line">
          {DESTINATIONS.map((destination) => (
            <Link
              key={destination.to}
              to={destination.to}
              className="cl-module-row grid gap-2 border-t border-line py-5 no-underline sm:grid-cols-[1fr_auto] sm:items-start sm:gap-5">
              <span>
                <span className="block text-lg font-bold leading-snug text-ink">
                  {destination.title}
                </span>
                <span className="mt-1.5 block text-[0.96rem] leading-relaxed text-ink-soft">
                  {destination.description}
                </span>
              </span>
              <span className="pt-1 text-xs text-ink-faint">{destination.kind}</span>
            </Link>
          ))}
        </div>

        <p className="m-0 mt-8 text-sm leading-relaxed text-ink-faint">
          If a page on this site linked you here, that is a bug worth reporting on the{' '}
          <Link to="https://github.com/stoicescueric/control-lab/issues">issue tracker</Link>.
        </p>
      </div>
    </main>
  );
}
