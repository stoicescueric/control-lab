import {useEffect, useRef, useState, type ComponentType, type ReactNode} from 'react';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import ControlResponseHero from '@site/src/components/home/ControlResponseHero';
import {completedCount, getLast, subscribe, type LastVisited} from '@site/src/lib/platform/progress';

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

interface AudienceSignal {
  number: string;
  title: string;
  body: string;
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
    body: 'Follow the derivation with non-obvious variables defined beside the equation and assumptions stated explicitly.',
  },
  {
    label: '03',
    title: 'Ship the controller',
    body: 'Translate the model into maintainable FTC Java, then account for loop timing, voltage, sensor noise, and actuator limits.',
  },
];

const MODULES: Module[] = [
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
    title: 'Localization & Odometry',
    description: 'Pose updates, dead-wheel geometry, pose exponentials, and accumulated error.',
    to: '/docs/localization-odometry',
  },
  {
    number: '04',
    title: 'Signal Processing',
    description: 'Low-pass, moving-average, complementary, Kalman, and extended Kalman filters.',
    to: '/docs/signal-processing',
  },
  {
    number: '05',
    title: 'Path Following & Kinematics',
    description: 'Mecanum kinematics, point control, pure pursuit, splines, and vector fields.',
    to: '/docs/path-following',
  },
  {
    number: '06',
    title: 'State-Space Control',
    description: 'System models, state feedback, observers, and linear-quadratic regulation.',
    to: '/docs/state-space-control',
  },
  {
    number: '07',
    title: 'Advanced Research',
    description: 'Numerical integration, aerodynamic drag, flywheel control, and dynamic targeting.',
    to: '/docs/advanced-research',
  },
];

const AUDIENCE_SIGNALS: AudienceSignal[] = [
  {
    number: '01',
    title: 'You have coded a robot',
    body: 'You can configure motors and sensors, write an OpMode, and work through ordinary hardware and software problems.',
  },
  {
    number: '02',
    title: 'You know the Java basics',
    body: 'Variables, methods, classes, loops, conditionals, and objects are familiar enough that the code does not hide the engineering idea.',
  },
  {
    number: '03',
    title: 'You want the reasoning, not only the recipe',
    body: 'You want to understand why controllers, filters, localization, and path followers work, when they fail, and how to adapt them.',
  },
];

function SectionLabel({children, inverse = false}: {children: ReactNode; inverse?: boolean}) {
  return (
    <p
      className={`m-0 text-sm font-bold uppercase ${
        inverse ? 'text-[#aebaff]' : 'text-brand'
      }`}>
      {children}
    </p>
  );
}

function ContinueLesson() {
  const [state, setState] = useState<{last?: LastVisited; count: number} | null>(null);

  useEffect(() => {
    const load = () => setState({last: getLast(), count: completedCount()});
    load();
    return subscribe(load);
  }, []);

  if (!state?.last) return null;

  return (
    <Link
      to={state.last.path}
      className="mt-10 grid gap-3 border border-line bg-surface px-5 py-4 no-underline hover:border-brand sm:grid-cols-[1fr_auto] sm:items-center">
        <span className="min-w-0">
        <span className="block text-sm font-bold text-ink">Continue reading</span>
        <span className="mt-1 block truncate text-sm text-ink-soft">{state.last.title}</span>
      </span>
      <span className="text-sm font-medium text-brand">
        {state.count} completed {state.count === 1 ? 'lesson' : 'lessons'}
      </span>
    </Link>
  );
}

const MARQUEE_TOPICS: string[] = [
  'PID Control',
  'Kalman Filtering',
  'Pure Pursuit',
  'State-Space Control',
  'Motion Profiling',
  'Feedforward',
  'Odometry',
  'Guided Vector Fields',
  'Quintic Splines',
  'System Identification',
];

function TopicMarquee() {
  const items = [...MARQUEE_TOPICS, ...MARQUEE_TOPICS];

  return (
    <div className="cl-marquee border-b border-panel-ink/10 bg-panel py-4" aria-hidden="true">
      <div className="cl-marquee__track">
        {[0, 1].map((copy) => (
          <div key={copy} className="flex shrink-0 items-center">
            {items.map((topic, index) => (
              <span
                key={`${copy}-${topic}-${index}`}
                className="flex items-center gap-8 px-4 font-mono text-sm font-semibold uppercase tracking-wide text-panel-ink/70">
                {topic}
                <span className="h-1.5 w-1.5 rounded-full bg-teal" />
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function Audience() {
  return (
    <section
      aria-labelledby="audience-heading"
      className="border-b border-[#2b354b] bg-panel text-panel-ink">
      <div className="mx-auto max-w-6xl px-6 pb-16 pt-8 sm:py-16">
        <div className="grid gap-12 lg:grid-cols-[1.05fr_1fr] lg:gap-20">
          <div>
            <SectionLabel inverse>Who this guide is for</SectionLabel>
            <div className="cl-scroll-reveal">
              <h2
                id="audience-heading"
                className="m-0 mt-5 max-w-xl text-4xl font-black leading-[1.03] text-panel-ink sm:text-5xl">
                You already made the robot move. Now understand why it behaves that way.
              </h2>
              <p className="m-0 mt-6 max-w-xl text-lg leading-relaxed text-panel-ink/75">
                Control Lab begins after the first successful robot program. It is written for FTC
                programmers who want to move beyond copied gains and black-box libraries into the
                models behind reliable autonomous behavior.
              </p>
            </div>
          </div>

          <ol className="m-0 list-none border-t border-panel-ink/20 p-0">
            {AUDIENCE_SIGNALS.map((signal) => (
              <li
                key={signal.number}
                className="cl-scroll-reveal grid gap-3 border-b border-panel-ink/20 py-6 sm:grid-cols-[3rem_1fr] sm:gap-5">
                <span className="font-mono text-sm font-semibold text-[#aebaff]">
                  {signal.number}
                </span>
                <span>
                  <span className="block text-xl font-bold leading-snug text-panel-ink">
                    {signal.title}
                  </span>
                  <span className="mt-2 block text-base leading-relaxed text-panel-ink/70">
                    {signal.body}
                  </span>
                </span>
              </li>
            ))}
          </ol>
        </div>

        <div className="cl-scroll-reveal mt-12 grid gap-6 border-t border-panel-ink/20 pt-7 md:grid-cols-[1fr_auto] md:items-center">
          <p className="m-0 max-w-3xl text-base leading-relaxed text-panel-ink/75">
            <strong className="text-panel-ink">Advanced mathematics is not a prerequisite.</strong>{' '}
            The preface builds calculus, linear algebra, differential equations, and state-space
            ideas from robotics examples before later lessons use them.
          </p>
          <Link
            to="/docs/preface/how-to-use"
            className="cl-home-action inline-flex min-h-11 items-center justify-center rounded-[6px] bg-panel-ink px-5 py-2.5 font-bold text-panel no-underline hover:bg-white">
            See how to use the guide
          </Link>
        </div>
      </div>
    </section>
  );
}

function LearningMethod() {
  return (
    <section className="border-b border-line bg-surface">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-16 lg:grid-cols-[0.8fr_1.4fr] lg:gap-20 lg:py-20">
        <div>
          <SectionLabel>Lesson method</SectionLabel>
          <h2 className="m-0 mt-4 text-3xl font-bold leading-tight text-ink">
            See it. Derive it. Ship it.
          </h2>
          <p className="m-0 mt-5 leading-relaxed text-ink-soft">
            The simulations are not decoration. Each one exposes a parameter or failure mode that
            the corresponding derivation and implementation must explain.
          </p>
        </div>
        <ol className="m-0 list-none border-t border-line p-0">
          {PRACTICES.map((practice) => (
            <li
              key={practice.label}
              className="cl-scroll-reveal grid gap-3 border-b border-line py-6 sm:grid-cols-[3rem_12rem_1fr] sm:gap-5">
              <span className="font-mono text-sm text-brand">{practice.label}</span>
              <h3 className="m-0 text-base font-bold leading-snug text-ink">{practice.title}</h3>
              <p className="m-0 text-[0.96rem] leading-relaxed text-ink-soft">{practice.body}</p>
            </li>
          ))}
        </ol>
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
        <div className="grid min-h-[420px] place-items-center bg-panel font-mono text-sm text-panel-ink/60">
          Loading the path follower
        </div>
      )}
    </div>
  );
}

function InteractiveExample() {
  return (
    <section className="cl-example-gradient relative border-b border-line bg-surface-2">
      <div className="relative mx-auto max-w-6xl px-6 py-16 lg:py-20">
        <div className="grid gap-8 lg:grid-cols-[0.85fr_1.5fr] lg:items-end">
          <div>
            <SectionLabel>Working example</SectionLabel>
            <h2 className="m-0 mt-4 text-3xl font-bold leading-tight text-ink">
              Geometry you can manipulate
            </h2>
          </div>
          <p className="m-0 max-w-2xl text-lg leading-relaxed text-ink-soft">
            Drag the waypoints and change the lookahead distance. The visualizer shows where the
            follower selects its target and why a larger lookahead trades tracking accuracy for a
            smoother command.
          </p>
        </div>

        <div className="mt-10 overflow-hidden rounded-[8px] border border-line bg-surface p-2">
          <LazyPurePursuit />
        </div>

        <div className="mt-6">
          <Link
            to="/docs/path-following/pure-pursuit"
            className="inline-flex min-h-11 items-center rounded-[6px] border border-line bg-surface px-5 py-2.5 font-semibold text-ink no-underline hover:border-brand hover:text-brand">
            Read the Pure Pursuit lesson
          </Link>
        </div>
      </div>
    </section>
  );
}

function ModuleRow({module}: {module: Module}) {
  return (
    <Link
      to={module.to}
      className="cl-scroll-reveal grid gap-3 border-t border-line py-6 no-underline hover:border-brand sm:grid-cols-[3.5rem_1fr]">
      <span className="font-mono text-sm text-brand">{module.number}</span>
      <span>
        <span className="block text-lg font-bold leading-snug text-ink">{module.title}</span>
        <span className="mt-2 block text-[0.95rem] leading-relaxed text-ink-soft">
          {module.description}
        </span>
      </span>
    </Link>
  );
}

function Curriculum() {
  return (
    <section className="bg-bg">
      <div className="mx-auto max-w-6xl px-6 py-16 lg:py-20">
        <div className="grid gap-10 lg:grid-cols-[0.8fr_1.4fr] lg:gap-20">
          <div>
            <SectionLabel>Curriculum</SectionLabel>
            <h2 className="m-0 mt-4 text-3xl font-bold leading-tight text-ink">
              Learn in the order the robot depends on it
            </h2>
            <p className="m-0 mt-5 leading-relaxed text-ink-soft">
              The preface supplies the mathematical vocabulary. Later modules reuse that vocabulary
              for motors, estimation, localization, path following, and the research case study.
            </p>
            <p className="m-0 mt-5 font-mono text-sm text-ink-faint">
              {MODULES.length} core modules · 1 math preface · advanced topics beyond the core path
            </p>
            <ContinueLesson />
          </div>

          <div>
            <Link
              to="/docs/preface/why-math-matters"
              className="cl-scroll-reveal grid gap-3 border-y border-brand py-6 no-underline sm:grid-cols-[3.5rem_1fr]">
              <span className="font-mono text-sm font-bold text-brand">00</span>
              <span>
                <span className="block text-lg font-bold text-ink">Why Math Matters</span>
                <span className="mt-2 block text-[0.95rem] leading-relaxed text-ink-soft">
                  Calculus, linear algebra, differential equations, and state-space models through
                  concrete robotics examples.
                </span>
              </span>
            </Link>

            <div className="grid lg:grid-cols-2 lg:gap-x-10">
              {MODULES.map((module) => (
                <ModuleRow key={module.number} module={module} />
              ))}
            </div>

            <Link
              to="/docs/advanced-topics"
              className="cl-scroll-reveal grid gap-3 border-y border-teal/50 py-6 no-underline hover:border-teal sm:grid-cols-[3.5rem_1fr]">
              <span className="font-mono text-sm font-bold text-teal">A+</span>
              <span>
                <span className="block text-lg font-bold text-ink">
                  Advanced Topics &amp; Misc
                </span>
                <span className="mt-2 block text-[0.95rem] leading-relaxed text-ink-soft">
                  Pedro Pathing internals, Jacobian inverse kinematics, guided vector fields,
                  interpolation, and additional derivations.
                </span>
              </span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function Closing() {
  const [last, setLast] = useState<LastVisited | undefined>(undefined);

  useEffect(() => {
    const load = () => setLast(getLast());
    load();
    return subscribe(load);
  }, []);

  return (
    <section className="border-t border-line bg-surface">
      <div className="mx-auto grid max-w-6xl gap-8 px-6 py-14 sm:grid-cols-[1fr_auto] sm:items-center">
        <div>
          <h2 className="m-0 text-2xl font-bold text-ink">
            {last ? 'Pick up where you left off.' : 'Start with the system on your bench.'}
          </h2>
          <p className="m-0 mt-3 max-w-2xl leading-relaxed text-ink-soft">
            {last
              ? `Continue from "${last.title}", or jump to the module that matches the mechanism currently on your workbench.`
              : 'Use the curriculum in order, or open the module that matches the mechanism currently on your workbench.'}
          </p>
        </div>
        <Link
          to={last ? last.path : '/docs/preface/why-math-matters'}
          className="inline-flex min-h-11 items-center justify-center rounded-[6px] bg-brand px-5 py-2.5 font-semibold text-white no-underline hover:bg-brand-dk">
          {last ? 'Continue reading' : 'Open the preface'}
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
      <ControlResponseHero />
      <TopicMarquee />
      <main>
        <Audience />
        <LearningMethod />
        <InteractiveExample />
        <Curriculum />
        <Closing />
      </main>
    </Layout>
  );
}
