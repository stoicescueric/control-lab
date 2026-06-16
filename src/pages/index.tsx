import type {ReactNode} from 'react';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import {motion, useReducedMotion} from 'framer-motion';
import PurePursuit from '@site/src/components/sims/PurePursuit';
import styles from './index.module.css';

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
  {n: '02', title: 'Signal Processing', blurb: 'Low-pass, moving-average, complementary, and Kalman filters.', to: '/docs/signal-processing'},
  {n: '03', title: 'Localization & Odometry', blurb: 'Pose exponentials, dead wheels, and why estimates drift.', to: '/docs/localization-odometry'},
  {n: '04', title: 'Motor Dynamics & Control Theory', blurb: 'The DC-motor model, feedforward, and competition-grade feedback.', to: '/docs/control-theory'},
  {n: '05', title: 'Path Following & Kinematics', blurb: 'Mecanum kinematics, pure pursuit, splines, and vector fields.', to: '/docs/path-following'},
  {n: '06', title: 'Advanced Research', blurb: 'RK4, air drag, and a full trajectory-simulation capstone.', to: '/docs/advanced-research'},
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
      initial={reduce ? false : {opacity: 0, y: 14}}
      whileInView={{opacity: 1, y: 0}}
      viewport={{once: true, margin: '-80px'}}
      transition={{duration: 0.38, delay, ease: EASE}}>
      {children}
    </motion.div>
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
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
        <path {...common} d="M4 16.5h2.5l2-9 3 12 2.2-7H20" />
      </svg>
    );
  }

  if (type === 'sum') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
        <path {...common} d="M18 5H7l6 7-6 7h11" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
      <path {...common} d="M5 12h14M12 5v14" />
      <path {...common} d="M7.5 7.5h9v9h-9z" />
    </svg>
  );
}

function ControlLoopVisual() {
  const reduce = useReducedMotion();
  const vlines = [40, 80, 120, 160, 200, 240, 280, 320, 360, 400];
  const hlines = [40, 80, 120, 160, 200, 240, 280];
  const response =
    'M40 250 C 120 250 150 58 220 58 C 280 58 300 92 360 88 C 395 86 410 90 430 90';

  return (
    <div className="border border-line bg-surface p-3 shadow-card">
      <svg viewBox="0 0 460 300" className="block w-full" role="img" aria-label="A step response settling onto its setpoint">
        <rect x="0" y="0" width="460" height="300" rx="8" fill="#0b1120" />
        <g stroke="#ffffff" strokeOpacity="0.06" strokeWidth="1">
          {vlines.map((x) => (
            <line key={`v${x}`} x1={x} y1="0" x2={x} y2="300" />
          ))}
          {hlines.map((y) => (
            <line key={`h${y}`} x1="0" y1={y} x2="460" y2={y} />
          ))}
        </g>
        <line x1="40" y1="90" x2="430" y2="90" stroke="#ffffff" strokeOpacity="0.32" strokeWidth="2" strokeLinecap="round" strokeDasharray="1 9" />
        <text x="40" y="80" fill="#7e8cac" fontSize="13" fontFamily="var(--font-mono)">setpoint</text>
        <motion.path
          d={response}
          fill="none"
          stroke="#6f8bff"
          strokeWidth="3.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={reduce ? {pathLength: 1} : {pathLength: 0}}
          animate={{pathLength: 1}}
          transition={{duration: 1.3, ease: 'easeInOut'}}
        />
        <motion.circle
          cx="430"
          cy="90"
          r="6"
          fill="#ffc24d"
          initial={reduce ? {opacity: 1} : {opacity: 0}}
          animate={{opacity: 1}}
          transition={{delay: reduce ? 0 : 1.2, duration: 0.25}}
        />
      </svg>
    </div>
  );
}

function Hero() {
  const reduce = useReducedMotion();
  const rise = (delay: number) => ({
    initial: reduce ? false : {opacity: 0, y: 12},
    animate: {opacity: 1, y: 0},
    transition: {duration: 0.4, delay, ease: EASE},
  });

  return (
    <header className={`${styles.heroGlow} border-b border-line`}>
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-16 lg:grid-cols-[1.04fr_0.96fr] lg:py-20">
        <div>
          <motion.div {...rise(0)} className="mb-5 inline-flex items-center gap-2 border border-line bg-surface px-3 py-1 font-mono text-xs font-medium text-ink-soft uppercase">
            <span className="inline-block h-1.5 w-1.5 bg-brand" />
            Interactive control-theory curriculum
          </motion.div>

          <motion.h1 {...rise(0.04)} className="m-0 max-w-3xl text-[2.35rem] leading-[1.08] font-extrabold text-ink sm:text-[2.9rem]">
            Control theory you can see, derive, and deploy.
          </motion.h1>

          <motion.p {...rise(0.1)} className="mt-6 max-w-xl text-lg leading-relaxed text-ink-soft">
            A rigorous, interactive curriculum for competitive robotics programmers who want to
            understand the math and architecture beneath the libraries they use in competition.
          </motion.p>

          <motion.div {...rise(0.16)} className="mt-8 flex flex-wrap items-center gap-3">
            <Link className="button button--primary button--lg" to="/docs/preface/why-math-matters">
              Start with the Preface
            </Link>
            <Link className="button button--secondary button--lg" to="/docs/control-theory">
              Jump to Control Theory
            </Link>
          </motion.div>

          <motion.p {...rise(0.22)} className="mt-6 font-mono text-xs text-ink-faint">
            Open source / MIT licensed / Built for FTC and FRC programmers
          </motion.p>
        </div>

        <motion.div
          initial={reduce ? false : {opacity: 0, scale: 0.98}}
          animate={{opacity: 1, scale: 1}}
          transition={{duration: 0.45, delay: 0.14, ease: EASE}}>
          <ControlLoopVisual />
        </motion.div>
      </div>
    </header>
  );
}

function Features() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-14 lg:py-16">
      <div className="grid gap-4 md:grid-cols-3">
        {FEATURES.map((f, i) => (
          <Reveal key={f.title} delay={i * 0.05}>
            <div className="h-full border border-line bg-surface p-6 shadow-card">
              <div className="mb-4 grid h-10 w-10 place-items-center border border-line bg-bg-soft text-brand" aria-hidden="true">
                <Icon type={f.icon} />
              </div>
              <h3 className="m-0 text-lg font-bold text-ink">{f.title}</h3>
              <p className="mt-2 mb-0 text-[0.95rem] leading-relaxed text-ink-soft">{f.body}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

function Showcase() {
  return (
    <section className="border-y border-line bg-surface-2">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-16 lg:grid-cols-2 lg:py-20">
        <Reveal>
          <p className="m-0 mb-3 font-mono text-xs font-semibold text-brand uppercase">
            Learn by doing
          </p>
          <h2 className="m-0 text-3xl font-extrabold text-ink">
            Do not just read the algorithm. Manipulate it.
          </h2>
          <p className="mt-4 text-[1.02rem] leading-relaxed text-ink-soft">
            This is a real pure-pursuit path follower: the geometry that steers FTC and FRC
            robots. Drag the waypoints, sweep the lookahead distance, and watch why tight
            tracking and smooth motion fight each other.
          </p>
          <Link className="button button--primary button--lg mt-7" to="/docs/path-following/pure-pursuit">
            Read the Pure Pursuit lesson
          </Link>
        </Reveal>
        <Reveal delay={0.08}>
          <PurePursuit />
        </Reveal>
      </div>
    </section>
  );
}

function Curriculum() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-16 lg:py-20">
      <Reveal className="mx-auto max-w-2xl text-center">
        <p className="m-0 mb-3 font-mono text-xs font-semibold text-brand uppercase">
          The curriculum
        </p>
        <h2 className="m-0 text-3xl font-extrabold text-ink">
          From feedback loops to original research
        </h2>
        <p className="mt-4 text-ink-soft">
          Six modules build from robot software architecture to filters, localization, motor
          modeling, path following, and trajectory simulation. Start anywhere; the cross-links keep
          the map intact.
        </p>
      </Reveal>

      <Reveal delay={0.04} className="mt-10">
        <Link
          to="/docs/preface/why-math-matters"
          className="group flex flex-col items-start justify-between gap-4 border border-brand/40 bg-bg-soft p-6 no-underline sm:flex-row sm:items-center">
          <div>
            <span className="font-mono text-xs font-semibold text-brand uppercase">Start here / Preface</span>
            <h3 className="m-0 mt-1 text-xl font-bold text-ink">Why the math matters</h3>
            <p className="m-0 mt-1 text-[0.95rem] text-ink-soft">The case for understanding the equations under the libraries you deploy.</p>
          </div>
          <span className="shrink-0 font-semibold text-brand">Read</span>
        </Link>
      </Reveal>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {MODULES.map((m, i) => (
          <Reveal key={m.n} delay={(i % 3) * 0.04}>
            <Link
              to={m.to}
              className="group flex h-full flex-col border border-line bg-surface p-6 no-underline shadow-card hover:border-brand/50">
              <span className="font-mono text-sm font-semibold text-ink-faint group-hover:text-brand">{m.n}</span>
              <h3 className="m-0 mt-2 text-base font-bold text-ink">{m.title}</h3>
              <p className="m-0 mt-2 text-[0.9rem] leading-relaxed text-ink-soft">{m.blurb}</p>
            </Link>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

function ClosingCTA() {
  return (
    <section className="border-t border-line bg-surface-2">
      <Reveal className="mx-auto max-w-3xl px-6 py-16 text-center">
        <h2 className="m-0 text-3xl font-extrabold text-ink">
          Open the black box.
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-ink-soft">
          Every controller, filter, and follower is written as intuition, derivation, and deployable
          Java. The result is not magic. It is engineering you can inspect.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link className="button button--primary button--lg" to="/docs/preface/why-math-matters">
            Start with the Preface
          </Link>
          <Link className="button button--secondary button--lg" to="/docs/signal-processing">
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
      <Hero />
      <main>
        <Features />
        <Showcase />
        <Curriculum />
        <ClosingCTA />
      </main>
    </Layout>
  );
}
