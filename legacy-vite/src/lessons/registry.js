/* The single source of truth for lessons.

   Every lesson lives in its own folder with an index.mdx that exports a `meta`
   object, e.g.:

     export const meta = {
       id: "pid",
       title: "PID Control",
       icon: "🚁",
       group: "Controllers",
       tag: "control",          // basics | filter | control | robo | ref
       short: "The world's most-used controller.",
       sub: "Three simple terms. Endless power.",
       order: 3,
     };

   This file discovers them automatically — so ADDING A LESSON = DROP A FOLDER.
   The sidebar, home-page cards and prev/next pager all build from this list. */

const modules = import.meta.glob("./*/index.mdx", { eager: true });

export const LESSONS = Object.values(modules)
  .filter((m) => m && m.meta)
  .map((m) => ({ ...m.meta, Content: m.default }))
  .sort((a, b) => (a.order ?? 999) - (b.order ?? 999));

export const LESSON_BY_ID = Object.fromEntries(LESSONS.map((l) => [l.id, l]));

/* Groups in the order their first lesson appears. */
export const GROUPS = LESSONS.reduce((acc, l) => {
  if (!acc.includes(l.group)) acc.push(l.group);
  return acc;
}, []);

export function lessonIndex(id) {
  return LESSONS.findIndex((l) => l.id === id);
}
