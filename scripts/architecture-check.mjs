import {existsSync, readFileSync, readdirSync} from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const failures = [];
const simulationRoot = path.join(root, 'src', 'components', 'simulations');
const sourceExtensions = new Set(['.js', '.jsx', '.ts', '.tsx', '.mdx']);
const simulationDomains = new Set([
  'control-theory',
  'foundations',
  'localization',
  'path-following',
  'research',
  'signal-processing',
  'software-architecture',
  'state-space',
]);
const componentRoot = path.join(root, 'src', 'components');
const libraryRoot = path.join(root, 'src', 'lib');

function walk(directory) {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, {withFileTypes: true}).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(fullPath) : [fullPath];
  });
}

function relative(file) {
  return path.relative(root, file).replaceAll('\\', '/');
}

function fail(message) {
  failures.push(message);
}

for (const entry of readdirSync(componentRoot, {withFileTypes: true})) {
  if (entry.isFile() && entry.name !== 'README.md') {
    fail(`src/components/${entry.name} must be placed in an ownership directory`);
  }
}

for (const entry of readdirSync(libraryRoot, {withFileTypes: true})) {
  if (entry.isFile() && entry.name !== 'README.md') {
    fail(`src/lib/${entry.name} must be placed in domain/, visualization/, or platform/`);
  }
}

for (const entry of readdirSync(simulationRoot, {withFileTypes: true})) {
  if (entry.isFile() && entry.name !== 'README.md') {
    fail(`src/components/simulations/${entry.name} must be placed in a domain directory`);
  }
  if (entry.isDirectory() && !simulationDomains.has(entry.name)) {
    fail(`src/components/simulations/${entry.name}/ is not a recognized simulation domain`);
  }
}

const sourceFiles = [
  ...walk(path.join(root, 'src')),
  ...walk(path.join(root, 'docs')),
].filter((file) => sourceExtensions.has(path.extname(file)));

const obsoleteImports = [
  '@site/src/components/sims/',
  '@site/src/components/ControlResponseHero',
  '@site/src/lib/analytics',
  '@site/src/lib/canvas',
  '@site/src/lib/consent',
  '@site/src/lib/controlMath',
  '@site/src/lib/linalg',
  '@site/src/lib/plot',
  '@site/src/lib/progress',
  '@site/src/lib/projectile',
  '@site/src/lib/videoEmbed',
];

for (const file of sourceFiles) {
  const source = readFileSync(file, 'utf8');
  const name = relative(file);

  for (const obsoleteImport of obsoleteImports) {
    if (source.includes(obsoleteImport)) {
      fail(`${name} uses obsolete import path "${obsoleteImport}"`);
    }
  }

  const simulationImports = source.matchAll(
    /@site\/src\/components\/simulations\/([^/'"]+)\/[^'"]+/g,
  );
  for (const match of simulationImports) {
    if (!simulationDomains.has(match[1])) {
      fail(`${name} imports a simulation from unknown domain "${match[1]}"`);
    }
  }
}

for (const file of walk(path.join(root, 'src', 'lib', 'domain')).filter((entry) =>
  sourceExtensions.has(path.extname(entry)),
)) {
  const source = readFileSync(file, 'utf8');
  const name = relative(file);
  const forbiddenPatterns = [
    {pattern: /from\s+['"]react(?:\/[^'"]*)?['"]/, label: 'React'},
    {pattern: /from\s+['"]@docusaurus\//, label: 'Docusaurus'},
    {pattern: /@site\/src\/(?:components|pages|theme|lib\/(?:platform|visualization))\//, label: 'an outer layer'},
    {pattern: /\b(?:window|document|localStorage|sessionStorage)\b/, label: 'a browser global'},
  ];

  for (const {pattern, label} of forbiddenPatterns) {
    if (pattern.test(source)) {
      fail(`${name} depends on ${label}; domain modules must be framework-independent`);
    }
  }
}

for (const file of walk(path.join(root, 'src', 'lib'))) {
  if (!sourceExtensions.has(path.extname(file))) continue;
  const source = readFileSync(file, 'utf8');
  if (/@site\/src\/(?:components|pages|theme)\//.test(source)) {
    fail(`${relative(file)} imports from a presentation layer`);
  }
}

if (failures.length > 0) {
  console.error('Architecture checks failed:');
  for (const message of failures) console.error(`- ${message}`);
  process.exit(1);
}

console.log(
  'Architecture checks passed: simulation domains, import paths, and library boundaries.',
);
