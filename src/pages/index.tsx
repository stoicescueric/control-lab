import type {ReactNode} from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import {motion, useReducedMotion} from 'framer-motion';
import PurePursuit from '@site/src/components/sims/PurePursuit';

import styles from './index.module.css';

/* ---------- content ---------- */

const FEATURES = [
  {
    icon: '🎛️',
    title: 'Intuition before equations',
    body: 'Every concept opens with an interactive simulation running the real algorithm. Drag a slider, break it on purpose, watch the behavior — then read the derivation.',
  },
  {
    icon: '∑',
    title: 'Rigor, not hand-waving',
    body: 'Properly typeset derivations in calculus, linear algebra, and state-space — pitched at programmers who want to understand the libraries, not memorize them.',
  },
  {
    icon: '⚙️',
    title: 'FTC-first, deploy-ready',
    body: 'Clean, abstracted Java for Road Runner, Pedro Pathing, and FTCLib — with the hardware realities (I²C latency, back-EMF, wheel slip) the textbooks leave out.',
  },
];

const MODULES = [
  {n: '01', title: 'Software Architecture & Loop Optimization', blurb: 'State machines, commands, loop time, units, and tuning infrastructure.', to: '/docs/software-architecture'},
  {n: '02', title: 'Signal Processing', blurb: 'Low-pass, moving-average, complementary, and Kalman filters.', to: '/docs/signal-processing'},
  {n: '03', title: 'Localization & Odometry', blurb: 'Pose exponentials, dead wheels, and why estimates drift.', to: '/docs/localization-odometry'},
  {n: '04', title: 'Motor Dynamics & Control Theory', blurb: 'The DC-motor model, feedforward, and a hardened PID.', to: '/docs/control-theory'},
  {n: '05', title: 'Path Following & Kinematics', blurb: 'Mecanum kinematics, pure pursuit, splines, vector fields.', to: '/docs/path-following'},
  {n: '06', title: 'Advanced Research', blurb: 'RK4, air drag, and a full trajectory-simulation capstone.', to: '/docs/advanced-research'},
];

/* ---------- motion helpers ---------- */

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
      initial={reduce ? false : {opacity: 0, y: 24}}
      whileInView={{opacity: 1, y: 0}}
      viewport={{once: true, margin: '-80px'}}
      transition={{duration: 0.55, delay, ease: EASE}}>
      {children}
    </motion.div>
  );
}

/* An animated step-response plot: the curriculum's recurring motif (a controller
   converging onto its setpoint), echoing the live sims' dark-canvas aesthetic. */
function ControlLoopVisual() {
  const reduce = useReducedMotion();
  const vlines = [40, 80, 120, 160, 200, 240, 280, 320, 360, 400];
  const hlines = [40, 80, 120, 160, 200, 240, 280];
  const response =
    'M40 250 C 120 250 150 58 220 58 C 280 58 300 92 360 88 C 395 86 410 90 430 90';

  return (
    <div className="rounded-2xl border border-line bg-surface p-3 shadow-pop">
      <svg viewBox="0 0 460 300" className="block w-full" role="img" aria-label="A step response settling onto its setpoint">
        <rect x="0" y="0" width="460" height="300" rx="12" fill="#0b1120" />
        <g stroke="#ffffff" strokeOpacity="0.06" strokeWidth="1">
          {vlines.map((x) => (
            <line key={`v${x}`} x1={x} y1="0" x2={x} y2="300" />
          ))}
          {hlines.map((y) => (
            <line key={`h${y}`} x1="0" y1={y} x2="460" y2={y} />
          ))}
        </g>
        {/* setpoint */}
        <line x1="40" y1="90" x2="430" y2="90" stroke="#ffffff" strokeOpacity="0.32" strokeWidth="2" strokeLinecap="round" strokeDasharray="1 9" />
        <text x="40" y="80" fill="#7e8cac" fontSize="13" fontFamily="var(--font-mono)">setpoint</text>
        {/* response */}
        <motion.path
          d={response}
          fill="none"
          stroke="#6f8bff"
          strokeWidth="3.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={reduce ? {pathLength: 1} : {pathLength: 0}}
          whileInView={{pathLength: 1}}
          viewport={{once: true}}
          transition={{duration: 1.8, ease: 'easeInOut'}}
        />
        <motion.circle
          cx="430"
          cy="90"
          r="6"
          fill="#ffc24d"
          initial={reduce ? {opacity: 1} : {opacity: 0}}
          whileInView={{opacity: 1}}
          viewport={{once: true}}
          transition={{delay: reduce ? 0 : 1.7, duration: 0.4}}
        />
      </svg>
    </div>
  );
}

/* ---------- sections ---------- */

function Hero() {
  const reduce = useReducedMotion();
  const rise = (delay: number) => ({
    initial: reduce ? false : {opacity: 0, y: 20},
    animate: {opacity: 1, y: 0},
    transition: {duration: 0.6, delay, ease: EASE},
  });

  return (
    <header className={clsx(styles.heroGlow, 'border-b border-line')}>
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-20 lg:grid-cols-[1.05fr_0.95fr] lg:py-28">
        <div>
          <motion.div {...rise(0)} className="mb-5 inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 font-mono text-xs font-medium tracking-wider text-ink-soft uppercase">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-brand" />
            Interactive control-theory curriculum
          </motion.div>

          <motion.h1 {...rise(0.06)} className="m-0 text-[2.6rem] leading-[1.05] font-extrabold tracking-tight text-ink sm:text-[3.2rem]">
            Control theory you can <span className="text-brand">see</span>, derive, and deploy.
          </motion.h1>

          <motion.p {...rise(0.14)} className="mt-6 max-w-xl text-lg leading-relaxed text-ink-soft">
            A rigorous, interactive curriculum for competitive robotics programmers who are done
            treating their libraries as black boxes. Read the intuition, poke the simulation, derive
            the math — then deploy the clean Java underneath.
          </motion.p>

          <motion.div {...rise(0.22)} className="mt-8 flex flex-wrap items-center gap-3">
            <Link className="button button--primary button--lg" to="/docs/preface/why-math-matters">
              Start with the Preface →
            </Link>
            <Link className="button button--secondary button--lg" to="/docs/control-theory">
              Jump to Control Theory
            </Link>
          </motion.div>

          <motion.p {...rise(0.3)} className="mt-6 font-mono text-xs text-ink-faint">
            Open source · MIT licensed · Built for FTC &amp; FRC programmers
          </motion.p>
        </div>

        <motion.div
          initial={reduce ? false : {opacity: 0, scale: 0.96}}
          animate={{opacity: 1, scale: 1}}
          transition={{duration: 0.7, delay: 0.2, ease: EASE}}>
          <ControlLoopVisual />
        </motion.div>
      </div>
    </header>
  );
}

function Features() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-16 lg:py-20">
      <div className="grid gap-6 md:grid-cols-3">
        {FEATURES.map((f, i) => (
          <Reveal key={f.title} delay={i * 0.08}>
            <div className="h-full rounded-2xl border border-line bg-surface p-7 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-pop">
              <div className="mb-4 grid h-11 w-11 place-items-center rounded-xl bg-bg-soft text-2xl" aria-hidden="true">
                {f.icon}
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
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-16 lg:grid-cols-2 lg:py-24">
        <Reveal>
          <p className="m-0 mb-3 font-mono text-xs font-semibold tracking-wider text-brand uppercase">
            Learn by doing
          </p>
          <h2 className="m-0 text-3xl font-extrabold tracking-tight text-ink">
            Don&apos;t read about the algorithm. Drag it.
          </h2>
          <p className="mt-4 text-[1.02rem] leading-relaxed text-ink-soft">
            This is a real pure-pursuit path follower — the same geometry that steers FTC and FRC
            robots. Drag the white waypoints to reshape the path, then sweep the lookahead distance
            from too small (it weaves) to too large (it cuts corners). Every lesson is built around a
            live model like this one.
          </p>
          <Link className="button button--primary button--lg mt-7" to="/docs/path-following/pure-pursuit">
            Read the Pure Pursuit lesson →
          </Link>
        </Reveal>
        <Reveal delay={0.1}>
          <PurePursuit />
        </Reveal>
      </div>
    </section>
  );
}

function Curriculum() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-16 lg:py-24">
      <Reveal className="mx-auto max-w-2xl text-center">
        <p className="m-0 mb-3 font-mono text-xs font-semibold tracking-wider text-brand uppercase">
          The curriculum
        </p>
        <h2 className="m-0 text-3xl font-extrabold tracking-tight text-ink">
          From your first feedback loop to original research
        </h2>
        <p className="mt-4 text-ink-soft">
          Seven modules that build on one another — software architecture up through a
          trajectory-simulation capstone. Start anywhere; the cross-links keep you oriented.
        </p>
      </Reveal>

      <Reveal delay={0.05} className="mt-10">
        <Link
          to="/docs/preface/why-math-matters"
          className="group flex flex-col items-start justify-between gap-4 rounded-2xl border border-brand/40 bg-bg-soft p-6 no-underline transition-all duration-200 hover:-translate-y-0.5 hover:shadow-pop sm:flex-row sm:items-center">
          <div>
            <span className="font-mono text-xs font-semibold tracking-wider text-brand uppercase">Start here · Preface</span>
            <h3 className="m-0 mt-1 text-xl font-bold text-ink">Why the math matters</h3>
            <p className="m-0 mt-1 text-[0.95rem] text-ink-soft">The case for understanding the equations under the libraries you deploy.</p>
          </div>
          <span className="shrink-0 font-semibold text-brand transition-transform duration-200 group-hover:translate-x-1">Read →</span>
        </Link>
      </Reveal>

      <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {MODULES.map((m, i) => (
          <Reveal key={m.n} delay={(i % 3) * 0.06}>
            <Link
              to={m.to}
              className="group flex h-full flex-col rounded-2xl border border-line bg-surface p-6 no-underline shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:border-brand/50 hover:shadow-pop">
              <span className="font-mono text-sm font-semibold text-ink-faint transition-colors group-hover:text-brand">{m.n}</span>
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
      <Reveal className="mx-auto max-w-3xl px-6 py-20 text-center">
        <h2 className="m-0 text-3xl font-extrabold tracking-tight text-ink">
          Ready to open the black box?
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-ink-soft">
          Every controller, filter, and follower in here ships with the intuition, the derivation,
          and the deployable Java. No prerequisites beyond Java and a willingness to take the math
          seriously.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link className="button button--primary button--lg" to="/docs/preface/why-math-matters">
            Start with the Preface →
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
      description="Control theory, state estimation & FTC robotics — an interactive, mathematically rigorous learning platform for competitive robotics programmers.">
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
