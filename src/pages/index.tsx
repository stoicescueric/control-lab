import {useEffect, useRef, useState, type ComponentType, type ReactNode} from 'react';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import {motion, useReducedMotion} from 'framer-motion';
import MathMatrixHero from '@site/src/components/MathMatrixHero';
import {completedCount, getLast, subscribe, type LastVisited} from '@site/src/lib/progress';

type FeatureIcon = 'signal' | 'sum' | 'deploy';

const FEATURES: {icon: FeatureIcon; title: string; body: string}[] = [
  {
    icon: 'signal',
    title: 'Intuition before equations',
    body: 'Every concept opens with a working model. Change the input, watch the robot behavior, then read the derivation that explains what happened.',
  },
  {
    icon: 'sum',
    title: 'Rigor without theater',
    body: 'Calculus, linear algebra, and state-space are used as engineering tools: compact language for motion, sensors, uncertainty, and control.',
  },
  {
    icon: 'deploy',
    title: 'FTC-first implementation',
    body: 'Lessons end in clean Java patterns that fit real OpModes: explicit units, telemetry, non-blocking loops, and hardware-aware limits.',
  },
];

const MODULES = [
  {n: '01', title: 'Software Architecture & Loop Optimization', blurb: 'State machines, commands, loop time, units, and tuning infrastructure.', to: '/docs/software-architecture'},
  {n: '02', title: 'Motor Dynamics & Control Theory', blurb: 'The DC-motor model, feedforward, and competition-grade feedback.', to: '/docs/control-theory'},
  {n: '03', title: 'Localization & Odometry', blurb: 'Pose exponentials, dead wheels, and why estimates drift.', to: '/docs/localization-odometry'},
  {n: '04', title: 'Signal Processing', blurb: 'Low-pass, moving-average, complementary, and Kalman filters.', to: '/docs/signal-processing'},
  {n: '05', title: 'Path Following & Kinematics', blurb: 'Mecanum kinematics, pure pursuit, splines, and vector fields.', to: '/docs/path-following'},
  {n: '06', title: 'State-Space Control', blurb: 'Model the mechanism as matrices, then let LQR pick the gains.', to: '/docs/state-space-control'},
  {n: '07', title: 'Advanced Research', blurb: 'RK4, air drag, and a full trajectory-simulation capstone.', to: '/docs/advanced-research'},
];

const EASE = [0.22, 1, 0.36, 1] as const;

function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : {opacity: 0, y: 18}}
      whileInView={{opacity: 1, y: 0}}
      viewport={{once: true, margin: '-90px'}}
      transition={{duration: 0.5, delay, ease: EASE}}>
      {children}
    </motion.div>
  );
}

function Kicker({children}: {children: ReactNode}) {
  return (
    <p className="m-0 mb-4 text-[0.82rem] font-semibold uppercase tracking-[0.14em] text-brand">
      {children}
    </p>
  );
}

function Icon({type}: {type: FeatureIcon}) {
  const common = {
    fill: 'none',
    stroke: 'currentColor',
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    strokeWidth: 1.8,
  };

  if (type === 'signal') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-6 w-6">
        <path {...common} d="M4 16.5h2.5l2-9 3 12 2.2-7H20" />
      </svg>
    );
  }

  if (type === 'sum') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-6 w-6">
        <path {...common} d="M18 5H7l6 7-6 7h11" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-6 w-6">
      <path {...common} d="M5 12h14M12 5v14" />
      <path {...common} d="M7.5 7.5h9v9h-9z" />
    </svg>
  );
}

/* "Continue where you left off" — reads the local progress store, so it only
   appears for returning readers (and never renders during SSR). */
function ContinueCard() {
  const [state, setState] = useState<{last?: LastVisited; count: number} | null>(null);

  useEffect(() => {
    const load = () => setState({last: getLast(), count: completedCount()});
    load();
    return subscribe(load);
  }, []);

  if (!state?.last) return null;

  return (
    <Reveal className="mt-10">
      <Link
        to={state.last.path}
        className="group mx-auto flex max-w-2xl items-center justify-between gap-4 rounded-full border border-line bg-surface py-3 pl-6 pr-3 no-underline shadow-card transition-colors hover:border-brand/40">
        <span className="min-w-0 truncate text-[0.95rem] text-ink-soft">
          <span className="font-semibold text-ink">Continue where you left off</span>
          <span className="mx-2 text-ink-faint">·</span>
          {state.last.title}
        </span>
        <span className="flex shrink-0 items-center gap-3">
          {state.count > 0 && (
            <span className="hidden text-[0.82rem] font-medium text-ink-faint sm:inline">
              {state.count} lesson{state.count === 1 ? '' : 's'} completed
            </span>
          )}
          <span className="grid h-9 w-9 place-items-center rounded-full bg-brand text-white transition-transform duration-300 group-hover:translate-x-0.5">
            <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </span>
        </span>
      </Link>
    </Reveal>
  );
}

/* The big centered statement that opens the page body — Apple-style intro. */
function Statement() {
  return (
    <section className="mx-auto max-w-4xl px-6 py-24 text-center lg:py-32">
      <Reveal>
        <h2 className="m-0 text-balance text-3xl font-semibold leading-[1.15] tracking-[-0.02em] text-ink sm:text-[2.6rem]">
          Every controller, filter, and follower — written as{' '}
          <span className="text-brand">intuition</span>,{' '}
          <span className="text-teal">derivation</span>, and{' '}
          <span className="text-ink">deployable Java</span>.
        </h2>
        <p className="mx-auto mt-6 max-w-2xl text-balance text-lg leading-relaxed text-ink-soft">
          The result is not magic. It is engineering you can inspect, tune, and trust on the field.
        </p>
      </Reveal>
    </section>
  );
}

function Features() {
  return (
    <section className="mx-auto max-w-6xl px-6 pb-24 lg:pb-32">
      <div className="grid gap-5 md:grid-cols-3">
        {FEATURES.map((f, i) => (
          <Reveal key={f.title} delay={i * 0.06}>
            <div className="h-full rounded-3xl border border-line bg-surface p-8 shadow-card transition-shadow duration-300 hover:shadow-pop">
              <div className="mb-6 grid h-12 w-12 place-items-center rounded-2xl bg-brand/10 text-brand" aria-hidden="true">
                <Icon type={f.icon} />
              </div>
              <h3 className="m-0 text-xl font-semibold tracking-tight text-ink">{f.title}</h3>
              <p className="mt-3 mb-0 text-[0.98rem] leading-relaxed text-ink-soft">{f.body}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* The showcase sim loads lazily: it sits below the fold, so its code splits
   into an async chunk fetched when the visitor scrolls near — the landing
   page's initial JS stays lean. The placeholder reserves the height so
   nothing shifts when it arrives. */
function LazyPurePursuit() {
  const ref = useRef<HTMLDivElement | null>(null);
  const [Sim, setSim] = useState<ComponentType | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          io.disconnect();
          import('@site/src/components/sims/PurePursuit').then((m) => setSim(() => m.default));
        }
      },
      {rootMargin: '600px'},
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className="min-h-[420px]">
      {Sim ? (
        <Sim />
      ) : (
        <div className="grid min-h-[420px] place-items-center rounded-2xl bg-panel font-mono text-sm text-panel-ink/40">
          loading the follower…
        </div>
      )}
    </div>
  );
}

/* The product shot: a real follower, framed like hardware. */
function Showcase() {
  return (
    <section className="border-y border-line bg-surface-2">
      <div className="mx-auto max-w-6xl px-6 py-24 lg:py-32">
        <Reveal className="mx-auto max-w-3xl text-center">
          <Kicker>Learn by doing</Kicker>
          <h2 className="m-0 text-balance text-3xl font-semibold leading-[1.12] tracking-[-0.02em] text-ink sm:text-[2.8rem]">
            Don&apos;t just read the algorithm.
            <br />
            Manipulate it.
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-balance text-lg leading-relaxed text-ink-soft">
            This is a real pure-pursuit path follower — the geometry that steers FTC and FRC robots.
            Drag the waypoints, sweep the lookahead distance, and watch why tight tracking and smooth
            motion fight each other.
          </p>
        </Reveal>

        <Reveal delay={0.08} className="mt-14">
          <div className="mx-auto max-w-4xl rounded-[28px] border border-line bg-surface p-2.5 shadow-pop sm:p-3">
            <LazyPurePursuit />
          </div>
        </Reveal>

        <Reveal delay={0.12} className="mt-10 text-center">
          <Link
            to="/docs/path-following/pure-pursuit"
            className="inline-flex items-center gap-2 rounded-full bg-brand px-7 py-3.5 text-[0.95rem] font-semibold text-white no-underline shadow-[0_8px_26px_rgba(79,108,247,0.3)] transition-colors hover:bg-brand-dk">
            Read the Pure Pursuit lesson
            <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </Link>
        </Reveal>
      </div>
    </section>
  );
}

function Curriculum() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-24 lg:py-32">
      <Reveal className="mx-auto max-w-2xl text-center">
        <Kicker>The curriculum</Kicker>
        <h2 className="m-0 text-balance text-3xl font-semibold leading-[1.12] tracking-[-0.02em] text-ink sm:text-[2.8rem]">
          From feedback loops to original research.
        </h2>
        <p className="mx-auto mt-6 text-balance text-lg leading-relaxed text-ink-soft">
          Seven modules build from robot software architecture through motors, localization,
          filters, and path following to state-space control and trajectory simulation. Start
          anywhere; the cross-links keep the map intact.
        </p>
      </Reveal>

      <ContinueCard />

      <Reveal delay={0.04} className="mt-14">
        <Link
          to="/docs/preface/why-math-matters"
          className="group flex flex-col items-start justify-between gap-5 rounded-3xl border border-brand/25 bg-gradient-to-br from-brand/[0.07] to-teal/[0.05] p-8 no-underline transition-colors hover:border-brand/50 sm:flex-row sm:items-center sm:p-9">
          <div>
            <span className="text-[0.78rem] font-semibold uppercase tracking-[0.14em] text-brand">
              Start here · Preface
            </span>
            <h3 className="m-0 mt-2 text-2xl font-semibold tracking-tight text-ink">Why the math matters</h3>
            <p className="m-0 mt-2 max-w-xl text-[0.98rem] leading-relaxed text-ink-soft">
              The case for understanding the equations under the libraries you deploy.
            </p>
          </div>
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-brand text-white transition-transform duration-300 group-hover:translate-x-1">
            <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </span>
        </Link>
      </Reveal>

      <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {MODULES.map((m, i) => (
          <Reveal key={m.n} delay={(i % 3) * 0.05}>
            <Link
              to={m.to}
              className="group relative flex h-full flex-col overflow-hidden rounded-3xl border border-line bg-surface p-7 no-underline shadow-card transition-all duration-300 hover:border-brand/40 hover:shadow-pop">
              <span
                aria-hidden="true"
                className="pointer-events-none absolute -right-2 -top-5 select-none text-[5.4rem] font-bold leading-none tracking-tight text-ink-faint/[0.13] transition-colors duration-300 group-hover:text-brand/[0.14]">
                {m.n}
              </span>
              <h3 className="relative m-0 mt-1 max-w-[15rem] text-[1.08rem] font-semibold leading-snug tracking-tight text-ink">
                {m.title}
              </h3>
              <p className="relative m-0 mt-3 flex-1 text-[0.92rem] leading-relaxed text-ink-soft">{m.blurb}</p>
              <span className="relative mt-5 inline-flex items-center gap-1.5 text-[0.88rem] font-semibold text-brand opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                Explore
                <svg viewBox="0 0 24 24" aria-hidden="true" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </span>
            </Link>
          </Reveal>
        ))}
      </div>

      <Reveal delay={0.08} className="mt-6">
        <Link
          to="/docs/advanced-topics"
          className="group flex flex-col items-start justify-between gap-4 rounded-3xl border border-line bg-surface p-7 no-underline shadow-card transition-all duration-300 hover:border-brand/40 hover:shadow-pop sm:flex-row sm:items-center">
          <div>
            <span className="text-[0.78rem] font-semibold uppercase tracking-[0.14em] text-teal">
              Beyond the modules
            </span>
            <h3 className="m-0 mt-2 text-[1.08rem] font-semibold tracking-tight text-ink">
              Advanced Topics &amp; Misc
            </h3>
            <p className="m-0 mt-2 max-w-2xl text-[0.92rem] leading-relaxed text-ink-soft">
              How Pedro Pathing works under the hood, guided-vector-field convergence proofs,
              take-back-half, Jacobian IK solvers, and the natural-cubic-spline derivation.
            </p>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1.5 text-[0.88rem] font-semibold text-brand">
            Explore
            <svg viewBox="0 0 24 24" aria-hidden="true" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </span>
        </Link>
      </Reveal>
    </section>
  );
}

function ClosingCTA() {
  return (
    <section className="border-t border-line bg-surface-2">
      <Reveal className="mx-auto max-w-3xl px-6 py-24 text-center lg:py-32">
        <h2 className="m-0 text-balance text-4xl font-semibold leading-[1.08] tracking-[-0.025em] text-ink sm:text-[3.2rem]">
          Open the black box.
        </h2>
        <p className="mx-auto mt-6 max-w-xl text-balance text-lg leading-relaxed text-ink-soft">
          Start with one lesson. Drag one slider. Watch one controller settle — and know exactly why
          it did.
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-3.5">
          <Link
            to="/docs/preface/why-math-matters"
            className="inline-flex items-center gap-2 rounded-full bg-brand px-7 py-3.5 text-[0.98rem] font-semibold text-white no-underline shadow-[0_8px_26px_rgba(79,108,247,0.3)] transition-colors hover:bg-brand-dk">
            Start with the Preface
          </Link>
          <Link
            to="/docs/signal-processing"
            className="inline-flex items-center rounded-full border border-line bg-surface px-7 py-3.5 text-[0.98rem] font-semibold text-ink no-underline transition-colors hover:border-brand/40 hover:text-brand">
            Explore Signal Processing
          </Link>
        </div>
      </Reveal>
    </section>
  );
}

export default function Home(): ReactNode {
  const {siteConfig} = useDocusaurusContext();
  return (
    <Layout
      title={siteConfig.title}
      description="Control theory, state estimation, and FTC robotics: an interactive, mathematically rigorous learning platform for competitive robotics programmers.">
      <MathMatrixHero />
      <main>
        <Statement />
        <Features />
        <Showcase />
        <Curriculum />
        <ClosingCTA />
      </main>
    </Layout>
  );
}
