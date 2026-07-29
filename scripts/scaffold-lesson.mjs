import {existsSync, readFileSync, readdirSync, writeFileSync} from 'node:fs';
import path from 'node:path';

const root = process.cwd();

function usage() {
  console.log(`Create a lesson shell from templates/lesson.mdx.

Usage:
  npm run new:lesson -- \\
    --module control-theory \\
    --slug motor-current-control \\
    --title "Motor Current Control" \\
    --description "Model and limit motor current from voltage, speed, and resistance." \\
    --position 8 \\
    --difficulty Medium \\
    --tags motor,current,control,ftc

Required:
  --module       Existing first-level module directory under docs/
  --slug         Lowercase kebab-case file name without .mdx
  --title        Lesson title
  --description  One-sentence search and link-preview description
  --position     Numeric sidebar position

Optional:
  --difficulty   Easy, Medium, or Hard (default: Medium)
  --tags         Comma-separated lowercase tags (default: module,ftc)
  --dry-run      Validate inputs and show the target without writing
  --help         Show this message

The generated lesson intentionally retains body placeholders. Fill them before
running npm run verify; the content check rejects unresolved {{PLACEHOLDERS}}.`);
}

function parseArgs(argv) {
  const values = new Map();
  for (let i = 0; i < argv.length; i++) {
    const key = argv[i];
    if (!key.startsWith('--')) {
      throw new Error(`unexpected argument "${key}"`);
    }
    if (key === '--help' || key === '--dry-run') {
      values.set(key.slice(2), 'true');
      continue;
    }
    const value = argv[++i];
    if (value === undefined || value.startsWith('--')) {
      throw new Error(`${key} needs a value`);
    }
    values.set(key.slice(2), value.trim());
  }
  return values;
}

function fail(message) {
  console.error(`Cannot scaffold lesson: ${message}`);
  console.error('Run "npm run new:lesson -- --help" for usage.');
  process.exit(1);
}

let args;
try {
  args = parseArgs(process.argv.slice(2));
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
}

if (args.has('help')) {
  usage();
  process.exit(0);
}

for (const key of ['module', 'slug', 'title', 'description', 'position']) {
  if (!args.get(key)) fail(`--${key} is required`);
}

const moduleName = args.get('module');
const slug = args.get('slug');
const title = args.get('title');
const description = args.get('description');
const position = Number(args.get('position'));
const difficulty = args.get('difficulty') ?? 'Medium';
const docsRoot = path.join(root, 'docs');
const modules = new Set(
  readdirSync(docsRoot, {withFileTypes: true})
    .filter(
      (entry) =>
        entry.isDirectory() && existsSync(path.join(docsRoot, entry.name, '_category_.json')),
    )
    .map((entry) => entry.name),
);

if (!modules.has(moduleName)) fail(`"${moduleName}" is not an existing docs module`);
if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) fail('--slug must be lowercase kebab-case');
if (!Number.isFinite(position) || position < 0) fail('--position must be a non-negative number');
if (!['Easy', 'Medium', 'Hard'].includes(difficulty)) {
  fail('--difficulty must be Easy, Medium, or Hard');
}
if (title.length < 3 || /[\r\n"]/.test(title)) {
  fail('--title must be a single line without double quotes');
}
if (description.length < 20 || !/[.!?]$/.test(description)) {
  fail('--description must be a complete sentence of at least 20 characters');
}
if (/[\r\n"]/.test(description)) {
  fail('--description must be a single line without double quotes');
}

const tags = (args.get('tags') ?? `${moduleName},ftc`)
  .split(',')
  .map((tag) => tag.trim())
  .filter(Boolean);
if (tags.length === 0 || tags.some((tag) => !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(tag))) {
  fail('--tags must be a comma-separated list of lowercase kebab-case tags');
}

const moduleRoot = path.join(docsRoot, moduleName);
const target = path.join(moduleRoot, `${slug}.mdx`);
if (path.dirname(target) !== moduleRoot) fail('target escaped the selected module');
if (existsSync(target)) fail(`${path.relative(root, target)} already exists`);

const templatePath = path.join(root, 'templates', 'lesson.mdx');
if (!existsSync(templatePath)) fail('templates/lesson.mdx is missing');

const lesson = readFileSync(templatePath, 'utf8')
  .replaceAll('{{TITLE}}', title)
  .replace('{{ONE_SENTENCE_DESCRIPTION}}', description)
  .replace('{{SIDEBAR_POSITION}}', String(position))
  .replace('{{TAG_LIST}}', tags.join(', '))
  .replace('{{Easy_OR_Medium_OR_Hard}}', difficulty);

if (args.has('dry-run')) {
  console.log(`Would create ${path.relative(root, target).replaceAll('\\', '/')}`);
  process.exit(0);
}

writeFileSync(target, lesson, {encoding: 'utf8', flag: 'wx'});
console.log(`Created ${path.relative(root, target).replaceAll('\\', '/')}`);
console.log(
  'Fill every remaining {{PLACEHOLDER}}, connect the lesson to its module, and run npm run verify.',
);
