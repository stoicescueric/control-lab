import {existsSync, readdirSync, statSync} from 'node:fs';
import path from 'node:path';

/* Production size budgets.
   ------------------------------------------------------------------
   A single total-site number cannot tell bloat from growth. Curriculum HTML and
   the search index get larger with every accepted lesson, which is the project
   working; JavaScript and media getting larger is the project regressing. So the
   build is measured per category, each with a limit chosen for what that
   category should be allowed to do, plus a per-file cap that catches one
   oversized file hiding inside a category that still has room.

   The total is only a backstop. If a category is over, that category's line is
   the finding — raising the total would not fix it. */

const root = process.cwd();
const buildDir = path.join(root, 'build');

const MB = 1024 * 1024;
const KB = 1024;

const BUDGETS = [
  {
    name: 'Scripts & styles',
    where: 'assets/js, assets/css',
    match: (file) => file.startsWith('assets/js/') || file.startsWith('assets/css/'),
    // The bloat guard. Bundles grow when a dependency or a simulation grows, and
    // neither should track lesson count. Keep this one tight.
    total: 8 * MB,
    perFile: 768 * KB,
  },
  {
    name: 'Lesson HTML',
    where: '*.html',
    match: (file) => file.endsWith('.html'),
    // Prose is the deliverable, so this budget is deliberately generous. The
    // per-file cap is what matters: one page far past it is a page that needs
    // splitting, not a budget that needs raising.
    total: 14 * MB,
    perFile: 768 * KB,
  },
  {
    name: 'Search index',
    where: 'search-index*.json',
    match: (file) => path.posix.basename(file).startsWith('search-index'),
    // Full-text over the whole curriculum, fetched only when a reader opens
    // search. Tracked on its own line so its growth stays visible instead of
    // disappearing into a total.
    total: 5 * MB,
    perFile: 5 * MB,
  },
  {
    name: 'Documents',
    where: 'papers/',
    match: (file) => file.startsWith('papers/'),
    // Previously unmeasured: the per-asset cap only ever applied under assets/,
    // so the largest single file on the site was the one file no rule inspected.
    total: 6 * MB,
    perFile: 6 * MB,
  },
  {
    name: 'Images',
    where: 'assets/images, img',
    match: (file) => file.startsWith('assets/images/') || file.startsWith('img/'),
    total: 3 * MB,
    perFile: 512 * KB,
  },
];

// Icons, manifests, the service worker, sitemap, robots.txt.
const OTHER = {
  name: 'Other static files',
  where: 'everything else',
  total: 2 * MB,
  perFile: 512 * KB,
};

const TOTAL_LIMIT = 36 * MB;

function walk(dir) {
  return readdirSync(dir, {withFileTypes: true}).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

function fmt(bytes) {
  if (bytes >= MB) return `${(bytes / MB).toFixed(2)} MB`;
  return `${(bytes / KB).toFixed(1)} KB`;
}

function bar(used, limit, width = 24) {
  const filled = Math.min(width, Math.round((used / limit) * width));
  return `${'#'.repeat(filled)}${'.'.repeat(width - filled)}`;
}

if (!existsSync(buildDir)) {
  console.error('No build/ directory found. Run `npm run build` first.');
  process.exit(1);
}

const files = walk(buildDir).map((file) => ({
  file,
  relative: path.relative(buildDir, file).replaceAll(path.sep, '/'),
  size: statSync(file).size,
}));

const failures = [];
const buckets = new Map(BUDGETS.map((budget) => [budget.name, []]));
buckets.set(OTHER.name, []);

for (const entry of files) {
  const budget = BUDGETS.find((candidate) => candidate.match(entry.relative));
  buckets.get(budget ? budget.name : OTHER.name).push(entry);
}

const total = files.reduce((sum, entry) => sum + entry.size, 0);

console.log('Production size budgets');
console.log('');

for (const budget of [...BUDGETS, OTHER]) {
  const entries = buckets.get(budget.name);
  const used = entries.reduce((sum, entry) => sum + entry.size, 0);
  const percent = ((used / budget.total) * 100).toFixed(0);

  console.log(
    `${budget.name.padEnd(18)} ${bar(used, budget.total)} ` +
      `${fmt(used).padStart(9)} / ${fmt(budget.total).padStart(9)}  ${String(percent).padStart(3)}%  (${budget.where})`,
  );

  if (used > budget.total) {
    failures.push(`${budget.name} is over budget by ${fmt(used - budget.total)}`);
  }
  for (const entry of entries) {
    if (entry.size > budget.perFile) {
      failures.push(
        `${entry.relative} is ${fmt(entry.size)}, over the ${budget.name.toLowerCase()} ` +
          `per-file cap of ${fmt(budget.perFile)}`,
      );
    }
  }
}

console.log('');
console.log(
  `${'Total'.padEnd(18)} ${bar(total, TOTAL_LIMIT)} ` +
    `${fmt(total).padStart(9)} / ${fmt(TOTAL_LIMIT).padStart(9)}  ` +
    `${String(((total / TOTAL_LIMIT) * 100).toFixed(0)).padStart(3)}%  (backstop)`,
);

if (total > TOTAL_LIMIT) {
  failures.push(`build exceeds the total backstop by ${fmt(total - TOTAL_LIMIT)}`);
}

console.log('');
console.log('Largest files:');
for (const entry of [...files].sort((a, b) => b.size - a.size).slice(0, 12)) {
  console.log(`${fmt(entry.size).padStart(10)}  ${entry.relative}`);
}

if (failures.length > 0) {
  console.error('\nSize checks failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
