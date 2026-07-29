import {execFileSync} from 'node:child_process';
import {existsSync, readFileSync, readdirSync} from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const failures = [];

function walk(directory, predicate = () => true) {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, {withFileTypes: true}).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    return entry.isDirectory()
      ? walk(fullPath, predicate)
      : predicate(fullPath)
        ? [fullPath]
        : [];
  });
}

function relative(file) {
  return path.relative(root, file).replaceAll('\\', '/');
}

function fail(message) {
  failures.push(message);
}

const trackedFiles = execFileSync('git', ['ls-files', '-z'], {
  cwd: root,
  encoding: 'utf8',
})
  .split('\0')
  .filter(Boolean);

const localToolFiles = new Set(['CLAUDE.md', '.cursorrules', 'skills-lock.json']);
for (const file of trackedFiles) {
  if (!existsSync(path.join(root, file))) continue;

  if (localToolFiles.has(file) || file.startsWith('.agents/')) {
    fail(`${file} is local tooling state and must not be published`);
  }

  const basename = path.posix.basename(file);
  if (/(?: copy| \(\d+\)| \d+)\.[^.]+$/i.test(basename)) {
    fail(`${file} looks like an unresolved duplicate file`);
  }
}

const publicTextFiles = [
  path.join(root, 'README.md'),
  path.join(root, 'CONTRIBUTING.md'),
  path.join(root, 'AGENTS.md'),
  path.join(root, 'AI_WORKFLOW.md'),
  path.join(root, 'GOVERNANCE.md'),
  path.join(root, 'package.json'),
  ...walk(path.join(root, 'docs'), (file) => file.endsWith('.mdx')),
  ...walk(path.join(root, 'src'), (file) => /\.(?:ts|tsx|js|jsx)$/.test(file)),
];

const inflatedPhrases = [
  /\benterprise-grade\b/i,
  /\bworld-class\b/i,
  /\bgame-changing\b/i,
  /\brevolutionary platform\b/i,
];
const placeholderPatterns = [
  /\[fill in\]/i,
  /\bTODO(?:\([^)]*\))?:/i,
  /\bTBD\b/,
  /\bLorem ipsum\b/i,
  /\{\{[A-Z][A-Z0-9_]*\}\}/,
  /YOUR-USERNAME/i,
  /#\/lessons\//,
];

for (const file of publicTextFiles) {
  const source = readFileSync(file, 'utf8');
  const name = relative(file);

  for (const phrase of inflatedPhrases) {
    if (phrase.test(source)) {
      fail(`${name} contains promotional language matched by ${phrase}`);
    }
  }

  for (const placeholder of placeholderPatterns) {
    if (placeholder.test(source)) {
      fail(`${name} contains an unresolved placeholder matched by ${placeholder}`);
    }
  }
}

for (const file of walk(path.join(root, 'docs'), (name) => name.endsWith('.mdx'))) {
  const source = readFileSync(file, 'utf8');
  const name = relative(file);
  const frontmatter = source.match(/^---\s*\r?\n([\s\S]*?)\r?\n---/);

  if (!frontmatter) {
    fail(`${name} is missing frontmatter`);
    continue;
  }

  for (const field of ['title', 'description', 'tags']) {
    if (!new RegExp(`^${field}:`, 'm').test(frontmatter[1])) {
      fail(`${name} frontmatter is missing ${field}`);
    }
  }

  if (path.basename(file) !== 'index.mdx' && !/<Abstract(?:\s|>)/.test(source)) {
    fail(`${name} is missing an Abstract component`);
  }

  if (/<iframe\b/i.test(source)) {
    fail(`${name} contains a raw iframe; use the consent-aware VideoEmbed component`);
  }

  if (/^#{1,6}\s+(?:The Hook|Physical Problem|Mathematical Solution|Enterprise Implementation)\s*$/im.test(source)) {
    fail(`${name} uses a deprecated generic lesson heading`);
  }
}

let proseWordCount = 0;
let proseEmDashCount = 0;
for (const file of walk(path.join(root, 'docs'), (name) => name.endsWith('.mdx'))) {
  const source = readFileSync(file, 'utf8');
  const words = source.match(/\b[\p{L}\p{N}][\p{L}\p{N}'-]*\b/gu)?.length ?? 0;
  const emDashes = source.match(/\u2014/g)?.length ?? 0;
  proseWordCount += words;
  proseEmDashCount += emDashes;

  if (words >= 200 && (emDashes * 1000) / words > 30) {
    fail(`${relative(file)} overuses em dashes; use sentences, commas, or term-definition colons`);
  }
}

if (proseWordCount > 0 && (proseEmDashCount * 1000) / proseWordCount > 12) {
  fail('MDX prose exceeds the project-wide em-dash density limit of 12 per 1,000 words');
}

const homepageFiles = [
  path.join(root, 'src', 'pages', 'index.tsx'),
  path.join(root, 'src', 'components', 'home', 'ControlResponseHero.tsx'),
];
for (const file of homepageFiles) {
  const source = readFileSync(file, 'utf8');
  const name = relative(file);
  for (const motif of ['bg-gradient', 'cl-tiles', 'cl-glitch', 'MathMatrixHero', 'framer-motion']) {
    if (source.includes(motif)) {
      fail(`${name} reintroduces the removed decorative motif "${motif}"`);
    }
  }
}

for (const file of walk(path.join(root, 'src'), (name) => /\.(?:ts|tsx|js|jsx)$/.test(name))) {
  const source = readFileSync(file, 'utf8');
  const emoji = source.match(/\p{Extended_Pictographic}/u);
  if (emoji) {
    fail(`${relative(file)} uses emoji UI (${emoji[0]}); use precise text or the project icon system`);
  }
}

if (!readFileSync(path.join(root, 'README.md'), 'utf8').includes('AI assistance is used')) {
  fail('README.md must retain the development-process disclosure');
}

if (failures.length > 0) {
  console.error('Content checks failed:');
  for (const message of failures) console.error(`- ${message}`);
  process.exit(1);
}

console.log(
  'Content checks passed: lesson structure, repository hygiene, public language, and UI conventions.',
);
