import {useEffect, useRef, useState, type ComponentType, type ReactNode} from 'react';
import Head from '@docusaurus/Head';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import ControlResponseHero from '@site/src/components/home/ControlResponseHero';
import {
  completedCount,
  getLast,
  subscribe,
  type LastVisited,
} from '@site/src/lib/platform/progress';

interface Practice {
  label: string;
  title: string;
  body: string;
}

interface Module {
  number: string;
  title: string;
  description: string;
  to: string;
}

const PRACTICES: Practice[] = [
  {
    label: '01',
    title: 'See the behavior',
    body: 'Change a gain, load, noise level, or path geometry and inspect the response before the notation appears.',
  },
  {
    label: '02',
    title: 'Derive the model',
    body: 'Follow the derivation with every non-obvious variable and assumption stated beside the equation.',
  },
  {
    label: '03',
    title: 'Ship the controller',
    body: 'Translate the model into maintainable FTC Java, then account for timing, voltage, noise, and actuator limits.',
  },
];

const CORE_MODULES: Module[] = [
  {
    number: '01',
    title: 'Software Architecture & Loop Optimization',
    description: 'State machines, command scheduling, loop time, units, and tuning infrastructure.',
    to: '/docs/software-architecture',
  },
  {
    number: '02',
    title: 'Motor Dynamics & Control Theory',
    description: 'DC motor physics, feedforward, feedback, saturation, and motion profiles.',
    to: '/docs/control-theory',
  },
  {
    number: '03',
    title: 'Signal Processing',
    description: 'Low-pass, moving-average, Savitzky-Golay, complementary, and Kalman filters.',
    to: '/docs/signal-processing',
  },
  {
    number: '04',
    title: 'Path Following & Kinematics',
    description: 'Mecanum kinematics, point control, pure pursuit, splines, and vector fields.',
    to: '/docs/path-following',
  },
  {
    number: '05',
    title: 'State-Space Control',
    description: 'System models, state feedback, observers, and linear-quadratic regulation.',
    to: '/docs/state-space-control',
  },
];

const ELECTIVE: Module = {
  number: 'E1',
  title: 'Drag-Aware Launcher',
  description:
    'Trajectory generation, launcher calibration, flywheel control, and dynamic targeting.',
  to: '/docs/advanced-research',
};

const STRUCTURED_DATA = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebSite',
      '@id': 'https://stoicescueric.github.io/control-lab/#website',
      url: 'https://stoicescueric.github.io/control-lab/',
      name: 'Control Lab',
      description:
        'Interactive lessons in control theory, state estimation, and FTC robotics, with derivations, simulations, and Java implementations.',
      inLanguage: 'en',
      license: 'https://opensource.org/license/mit',
    },
    {
      '@type': 'Course',
      '@id': 'https://stoicescueric.github.io/control-lab/#course',
      url: 'https://stoicescueric.github.io/control-lab/',
      name: 'Control Lab: Control Theory and FTC Robotics',
      description:
        'A free, interactive curriculum that teaches control theory, state estimation, signal processing, path following, and robotics implementation in Java.',
      provider: {
        '@type': 'Person',
        name: 'Eric Stoicescu',
        url: 'https://github.com/stoicescueric',
      },
      isAccessibleForFree: true,
      inLanguage: 'en',
      educationalLevel: 'Intermediate',
      audience: {
        '@type': 'EducationalAudience',
        educationalRole: 'student',
      },
      teaches: [
        'control theory',
        'state estimation',
        'FTC robotics',
        'signal processing',
        'path following',
        'state-space control',
      ],
      license: 'https://opensource.org/license/mit',
    },
  ],
};

function SectionLabel({children}: {children: ReactNode}) {
  return <p className="m-0 font-mono text-xs font-semibold text-accent-text">{children}</p>;
}

function ReaderEntry() {
  const [state, setState] = useState<{last?: LastVisited; count: number}>({count: 0});

  useEffect(() => {
    const load = () => setState({last: getLast(), count: completedCount()});
    load();
    return subscribe(load);
  }, []);

  const destination = state.last?.path ?? '/docs/preface/why-math-matters';
  const title = state.last?.title ?? 'Why Math Matters';

  return (
    <section aria-label="Your next lesson" className="border-y border-line bg-surface">
      <div className="mx-auto grid max-w-6xl gap-4 px-6 py-5 sm:grid-cols-[1fr_auto] sm:items-center">
        <div className="min-w-0">
          <p className="m-0 font-mono text-xs font-semibold text-accent-text">
            {state.last ? 'Continue where you left off' : 'Start from first principles'}
          </p>
          <p className="m-0 mt-1 truncate text-lg font-bold text-ink">{title}</p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          {state.count > 0 && (
            <span className="font-mono text-xs text-ink-faint">
              {state.count} {state.count === 1 ? 'lesson' : 'lessons'} complete
            </span>
          )}
          <Link
            to={destination}
            className="cl-home-action inline-flex min-h-11 items-center justify-center rounded-[10px] bg-accent-fill px-5 py-2.5 font-semibold text-on-accent no-underline hover:bg-brand-dk">
            {state.last ? 'Continue reading' : 'Open the preface'}
          </Link>
        </div>
      </div>
    </section>
  );
}

function ModuleRow({module, kind = 'Module'}: {module: Module; kind?: string}) {
  return (
    <Link
      to={module.to}
      className="cl-module-row group grid gap-3 border-t border-line py-6 no-underline sm:grid-cols-[3.75rem_1fr_auto] sm:items-start sm:gap-5">
      <span className="font-mono text-sm font-semibold text-accent-text">{module.number}</span>
      <span>
        <span className="block text-lg font-bold leading-snug text-ink">{module.title}</span>
        <span className="mt-1.5 block max-w-2xl text-[0.96rem] leading-relaxed text-ink-soft">
          {module.description}
        </span>
      </span>
      <span className="hidden pt-0.5 font-mono text-xs text-ink-faint sm:block" aria-hidden="true">
        {kind} →
      </span>
    </Link>
  );
}

function Curriculum() {
  return (
    <section id="curriculum" aria-labelledby="curriculum-heading" className="scroll-mt-20 bg-bg">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-16 lg:grid-cols-[0.72fr_1.28fr] lg:gap-20 lg:py-24">
        <div>
          <SectionLabel>Curriculum / 00–05</SectionLabel>
          <h2
            id="curriculum-heading"
            className="m-0 mt-4 text-3xl font-bold leading-tight text-ink sm:text-4xl">
            Learn in the order the robot depends on it.
          </h2>
          <p className="m-0 mt-5 max-w-lg leading-relaxed text-ink-soft">
            Begin with the mathematical vocabulary, then follow the dependency chain from software
            structure and motors to estimation, path following, and state-space control.
          </p>
          <p className="m-0 mt-5 font-mono text-xs leading-relaxed text-ink-faint">
            5 core modules · 1 elective · 1 math preface
          </p>
        </div>

        <div className="border-b border-line">
          <ModuleRow
            kind="Preface"
            module={{
              number: '00',
              title: 'Why Math Matters',
              description:
                'Calculus, linear algebra, differential equations, and state-space models through concrete robotics examples.',
              to: '/docs/preface/why-math-matters',
            }}
          />
          {CORE_MODULES.map((module) => (
            <ModuleRow key={module.number} module={module} />
          ))}
          <ModuleRow module={ELECTIVE} kind="Elective" />
          <ModuleRow
            kind="Reference"
            module={{
              number: 'A+',
              title: 'Advanced Topics & Misc',
              description:
                'Pedro Pathing internals, Jacobian inverse kinematics, guided vector fields, interpolation, and additional derivations.',
              to: '/docs/advanced-topics',
            }}
          />
        </div>
      </div>
    </section>
  );
}

function LazyPurePursuit() {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [Simulator, setSimulator] = useState<ComponentType | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        import('@site/src/components/simulations/path-following/PurePursuit').then((module) => {
          setSimulator(() => module.default);
        });
      },
      {rootMargin: '500px'},
    );

    observer.observe(root);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={rootRef} className="min-h-[420px]">
      {Simulator ? (
        <Simulator />
      ) : (
        <div className="grid min-h-[420px] place-items-center bg-panel font-mono text-sm text-panel-ink/70">
          Loading the path follower
        </div>
      )}
    </div>
  );
}

function InteractiveExample() {
  return (
    <section aria-labelledby="example-heading" className="border-y border-line bg-surface">
      <div className="mx-auto max-w-6xl px-6 py-16 lg:py-24">
        <div className="grid gap-6 lg:grid-cols-[0.72fr_1.28fr] lg:items-end lg:gap-20">
          <div>
            <SectionLabel>Inside a lesson</SectionLabel>
            <h2
              id="example-heading"
              className="m-0 mt-4 text-3xl font-bold leading-tight text-ink sm:text-4xl">
              Change the geometry. Watch the follower respond.
            </h2>
          </div>
          <p className="m-0 max-w-2xl text-lg leading-relaxed text-ink-soft">
            Drag the waypoints and adjust lookahead distance. The visualizer exposes the exact
            tradeoff between tracking accuracy and a smoother command before the lesson derives it.
          </p>
        </div>

        <div className="mt-10 overflow-hidden rounded-[12px] border border-line bg-panel p-2 shadow-card">
          <LazyPurePursuit />
        </div>

        <Link
          to="/docs/path-following/pure-pursuit"
          className="cl-home-action mt-6 inline-flex min-h-11 items-center rounded-[10px] border border-line bg-surface px-5 py-2.5 font-semibold text-ink no-underline hover:border-accent-text hover:text-accent-text">
          Read the Pure Pursuit lesson →
        </Link>
      </div>
    </section>
  );
}

function GuideNotes() {
  return (
    <section aria-labelledby="method-heading" className="bg-bg">
      <div className="mx-auto grid max-w-6xl gap-12 px-6 py-16 lg:grid-cols-2 lg:gap-20 lg:py-24">
        <div>
          <SectionLabel>How lessons work</SectionLabel>
          <h2 id="method-heading" className="m-0 mt-4 text-3xl font-bold leading-tight text-ink">
            See it. Derive it. Ship it.
          </h2>
          <p className="m-0 mt-4 max-w-xl leading-relaxed text-ink-soft">
            The simulations are working diagrams, not decoration. Each one introduces a behavior
            that the derivation and implementation must explain.
          </p>
          <ol className="m-0 mt-8 list-none border-b border-line p-0">
            {PRACTICES.map((practice) => (
              <li
                key={practice.label}
                className="grid gap-2 border-t border-line py-5 sm:grid-cols-[2.5rem_9rem_1fr] sm:gap-4">
                <span className="font-mono text-xs font-semibold text-accent-text">
                  {practice.label}
                </span>
                <h3 className="m-0 text-base font-bold leading-snug text-ink">{practice.title}</h3>
                <p className="m-0 text-[0.94rem] leading-relaxed text-ink-soft">{practice.body}</p>
              </li>
            ))}
          </ol>
        </div>

        <div>
          <SectionLabel>Before you start</SectionLabel>
          <h2 className="m-0 mt-4 text-3xl font-bold leading-tight text-ink">
            Built for programmers who want the reasoning, not only the recipe.
          </h2>
          <p className="m-0 mt-5 max-w-xl leading-relaxed text-ink-soft">
            You should be comfortable with basic Java and have made a robot move. Advanced
            mathematics is not a prerequisite: the preface builds it from robotics examples before
            later lessons use it.
          </p>
          <div className="mt-8 border-y border-line py-5">
            <p className="m-0 font-semibold text-ink">The guide assumes</p>
            <p className="m-0 mt-2 leading-relaxed text-ink-soft">
              Variables, methods, classes, loops, conditionals, motors, sensors, and ordinary FTC
              debugging—not prior controls coursework.
            </p>
          </div>
          <Link
            to="/docs/preface/how-to-use"
            className="cl-home-action mt-6 inline-flex min-h-11 items-center rounded-[10px] border border-line bg-surface px-5 py-2.5 font-semibold text-ink no-underline hover:border-accent-text hover:text-accent-text">
            See how to use the guide →
          </Link>
        </div>
      </div>
    </section>
  );
}

function Closing() {
  return (
    <section className="border-t border-line bg-surface">
      <div className="mx-auto grid max-w-6xl gap-6 px-6 py-12 sm:grid-cols-[1fr_auto] sm:items-center lg:py-16">
        <div>
          <h2 className="m-0 text-2xl font-bold text-ink">Start with the system on your bench.</h2>
          <p className="m-0 mt-2 max-w-2xl leading-relaxed text-ink-soft">
            Read in order, or open the module that matches the mechanism you are tuning today.
          </p>
        </div>
        <Link
          to="/docs/preface/why-math-matters"
          className="cl-home-action inline-flex min-h-11 items-center justify-center rounded-[10px] bg-accent-fill px-5 py-2.5 font-semibold text-on-accent no-underline hover:bg-brand-dk">
          Open the preface
        </Link>
      </div>
    </section>
  );
}

export default function Home(): ReactNode {
  const {siteConfig} = useDocusaurusContext();

  return (
    <Layout
      title={siteConfig.title}
      description="Interactive lessons in control theory, state estimation, and FTC robotics, with derivations, simulations, and Java implementations.">
      <Head>
        <script type="application/ld+json">{JSON.stringify(STRUCTURED_DATA)}</script>
      </Head>
      <main>
        <ControlResponseHero />
        <ReaderEntry />
        <Curriculum />
        <InteractiveExample />
        <GuideNotes />
        <Closing />
      </main>
    </Layout>
  );
}
