import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { LESSONS } from "../lessons/registry.js";
import BlurText from "../components/reactbits/BlurText.jsx";
import GradientText from "../components/reactbits/GradientText.jsx";
import SpotlightCard from "../components/reactbits/SpotlightCard.jsx";
import AnimatedContent from "../components/reactbits/AnimatedContent.jsx";

const TAG_STYLES = {
  basics: "bg-brand/15 text-brand-dk",
  filter: "bg-teal/15 text-[#0c8174] dark:text-teal",
  control: "bg-amber/20 text-[#b06e02] dark:text-amber",
  robo: "bg-rose/15 text-[#c41f57] dark:text-rose",
  ref: "bg-violet/15 text-[#6d3fd1] dark:text-violet",
  paper: "bg-violet/15 text-[#6d3fd1] dark:text-violet",
};

const btn =
  "inline-flex items-center gap-2 rounded-xl px-[22px] py-3 text-base font-semibold no-underline transition-colors";

function LessonCard({ lesson, index }) {
  return (
    <AnimatedContent delay={(index % 3) * 0.06} className="h-full">
      <Link to={`/lessons/${lesson.id}`} className="block h-full no-underline">
        <SpotlightCard className="h-full rounded-2xl border border-line bg-surface p-[22px] transition-[transform,box-shadow,border-color] duration-150 hover:-translate-y-1 hover:border-[#cfd8ee] hover:shadow-pop">
          <span className="block text-[2rem]">{lesson.icon}</span>
          <div className="mt-1 text-[0.75rem] font-bold tracking-[0.05em] text-ink-faint">
            LESSON {String(lesson.order).padStart(2, "0")}
          </div>
          <h3 className="mb-1.5 mt-1 text-[1.2rem] font-bold text-ink">{lesson.title}</h3>
          <p className="m-0 text-[0.94rem] text-ink-soft">{lesson.short}</p>
          <span
            className={`mt-3 inline-block rounded-full px-2.5 py-[3px] text-[0.74rem] font-semibold ${
              TAG_STYLES[lesson.tag] || TAG_STYLES.basics
            }`}
          >
            {lesson.group}
          </span>
        </SpotlightCard>
      </Link>
    </AnimatedContent>
  );
}

export default function Home() {
  const firstRobot = LESSONS.find((l) => l.tag === "robo");

  return (
    <main className="w-full">
      {/* ---------- hero ---------- */}
      <section
        className="border-b border-line px-6 pb-14 pt-16"
        style={{
          background:
            "radial-gradient(1200px 500px at 80% -10%, rgba(139,92,246,.18), transparent 60%), radial-gradient(900px 500px at 0% 0%, rgba(17,181,164,.16), transparent 55%), linear-gradient(160deg, #f7f9ff, #eaf0ff)",
        }}
      >
        <div className="mx-auto max-w-[1180px]">
          <motion.span
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="inline-block rounded-full bg-brand/15 px-3 py-[5px] text-[0.8rem] font-bold uppercase tracking-[0.08em] text-brand-dk"
          >
            ⚙️ Control Lab
          </motion.span>

          <h1 className="mb-3.5 mt-[18px] max-w-[20ch] text-[clamp(1.9rem,4vw,3rem)] font-extrabold leading-[1.1] tracking-[-0.02em] text-ink">
            <BlurText text="Make sense of filters, controllers &" />{" "}
            <GradientText className="font-extrabold">robots</GradientText>{" "}
            <BlurText text="— by playing with them." delay={60} />
          </h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="max-w-[62ch] text-[1.18rem] text-ink-soft"
          >
            PID, Kalman filters, feedforward, odometry… these sound like rocket science.
            They're built from a few simple ideas. Learn them with plain language, friendly
            pictures, and <strong className="text-ink">interactive demos you can poke at</strong>,
            then carry them onto a real <strong className="text-ink">FTC robot</strong> — with the
            actual Java code, explained line by line.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.65 }}
            className="mt-7 flex flex-wrap gap-3"
          >
            <Link
              to="/lessons/intro"
              className={`${btn} bg-brand text-white shadow-[0_8px_20px_rgba(79,108,247,.35)] hover:bg-brand-dk`}
            >
              Start from the beginning →
            </Link>
            {firstRobot && (
              <Link
                to={`/lessons/${firstRobot.id}`}
                className={`${btn} border border-line bg-surface text-ink hover:bg-surface-2`}
              >
                🤖 Jump to the robotics track
              </Link>
            )}
          </motion.div>
        </div>
      </section>

      {/* ---------- topic cards ---------- */}
      <div className="mx-auto max-w-[1180px] px-6 pb-20">
        <h2 className="mt-12 text-[clamp(1.4rem,2.6vw,2rem)] font-bold tracking-[-0.01em] text-ink">
          🧭 Pick a topic
        </h2>
        <p className="max-w-[64ch] text-ink-soft">
          Brand new? Go top to bottom. Already know the basics? Jump straight to the idea you're
          curious about — every page stands on its own.
        </p>

        <div className="mt-6 grid gap-[18px] [grid-template-columns:repeat(auto-fill,minmax(250px,1fr))]">
          {LESSONS.map((lesson, i) => (
            <LessonCard key={lesson.id} lesson={lesson} index={i} />
          ))}
        </div>

        {/* ---------- filter vs controller ---------- */}
        <AnimatedContent>
          <h2 className="mt-14 text-[clamp(1.4rem,2.6vw,2rem)] font-bold tracking-[-0.01em] text-ink">
            🤔 Filter or controller?
          </h2>
          <p className="max-w-[64ch] text-ink-soft">
            They're the two halves of almost every smart machine — a drone, a self-driving car,
            your FTC robot.
          </p>
          <div className="mt-4 grid gap-[18px] md:grid-cols-2">
            <div className="rounded-2xl border border-line bg-surface p-[22px]">
              <span className="block text-[2rem]">🌊</span>
              <h3 className="mb-1.5 mt-2 text-[1.2rem] font-bold text-ink">
                A filter cleans up what you <em>know</em>
              </h3>
              <p className="m-0 text-[0.94rem] text-ink-soft">
                Sensors are noisy and shaky. A filter turns messy measurements into a clean
                estimate of the truth — like wiping fog off a window.
              </p>
              <span className="mt-3 inline-block rounded-full bg-teal/15 px-2.5 py-[3px] text-[0.74rem] font-semibold text-[#0c8174] dark:text-teal">
                Kalman · EKF · Low-pass
              </span>
            </div>
            <div className="rounded-2xl border border-line bg-surface p-[22px]">
              <span className="block text-[2rem]">🎮</span>
              <h3 className="mb-1.5 mt-2 text-[1.2rem] font-bold text-ink">
                A controller decides what to <em>do</em>
              </h3>
              <p className="m-0 text-[0.94rem] text-ink-soft">
                Once you know where things are, a controller chooses the action — more thrust,
                turn left, hold this arm angle — to reach the goal and stay there.
              </p>
              <span className="mt-3 inline-block rounded-full bg-amber/20 px-2.5 py-[3px] text-[0.74rem] font-semibold text-[#b06e02] dark:text-amber">
                PID · Feedforward · MPC
              </span>
            </div>
          </div>
        </AnimatedContent>

        <AnimatedContent>
          <div className="mt-9 flex gap-3.5 rounded-[10px] border border-amber/30 bg-amber/10 p-4 text-ink">
            <span className="shrink-0 text-2xl leading-tight">💡</span>
            <div>
              <strong>How to get the most out of this site:</strong> don't just read — drag the
              sliders! Every demo lets you break things on purpose. Crank a gain until the robot
              goes wild, then bring it back. That "aha" is the whole point.
            </div>
          </div>
        </AnimatedContent>
      </div>

      <footer className="border-t border-line bg-surface px-6 py-7 text-[0.9rem] text-ink-faint">
        <div className="mx-auto max-w-[1180px]">
          A friendly, hands-on intro to control theory, state estimation & FTC robotics · open
          source · everything runs right in your browser.
        </div>
      </footer>
    </main>
  );
}
