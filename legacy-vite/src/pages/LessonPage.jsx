import { useParams, Navigate } from "react-router-dom";
import { motion } from "framer-motion";
import { LESSON_BY_ID } from "../lessons/registry.js";
import Pager from "../components/layout/Pager.jsx";

/* Renders one lesson: a header built from the lesson's meta, the MDX body
   (styled by the `lesson-prose` typography theme), then the prev/next pager.
   Components used inside the MDX come from the MDXProvider set up in App.jsx. */
export default function LessonPage() {
  const { id } = useParams();
  const lesson = LESSON_BY_ID[id];
  if (!lesson) return <Navigate to="/" replace />;

  const { Content } = lesson;

  return (
    <motion.main
      key={id}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="mx-auto w-full max-w-[860px] px-6 pb-24 pt-10"
    >
      <header className="mb-2 border-b border-line pb-6">
        <span className="inline-flex items-center gap-2 text-[0.8rem] font-bold uppercase tracking-[0.06em] text-brand-dk">
          {lesson.icon}{" "}
          {lesson.kicker || `${lesson.group} · Lesson ${String(lesson.order).padStart(2, "0")}`}
        </span>
        <h1 className="mb-2 mt-2.5 text-[clamp(1.9rem,4vw,3rem)] font-extrabold leading-[1.1] tracking-[-0.02em] text-ink">
          {lesson.title}
        </h1>
        {lesson.sub && <p className="m-0 text-[1.12rem] text-ink-soft">{lesson.sub}</p>}
      </header>

      <article className="lesson-prose prose prose-slate">
        <Content />
      </article>

      <Pager id={id} />
    </motion.main>
  );
}
