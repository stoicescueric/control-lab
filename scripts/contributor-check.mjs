import {existsSync, readFileSync} from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const failures = [];

function source(relativePath) {
  const absolutePath = path.join(root, relativePath);
  if (!existsSync(absolutePath)) {
    failures.push(`${relativePath} is required by the contributor workflow`);
    return '';
  }
  return readFileSync(absolutePath, 'utf8');
}

function requireText(relativePath, text, expected) {
  if (!text.includes(expected)) {
    failures.push(`${relativePath} must reference "${expected}"`);
  }
}

const governance = source('GOVERNANCE.md');
const codeOfConduct = source('CODE_OF_CONDUCT.md');
const contributing = source('CONTRIBUTING.md');
const readme = source('README.md');
const lessonTemplate = source('templates/lesson.mdx');
const codeowners = source('.github/CODEOWNERS');
const pullRequestTemplate = source('.github/PULL_REQUEST_TEMPLATE.md');
const proposalTemplate = source('.github/ISSUE_TEMPLATE/lesson-proposal.yml');
const maintainerSetup = source('.github/MAINTAINER_SETUP.md');
const packageJson = source('package.json');
const scaffolder = source('scripts/scaffold-lesson.mjs');
const gitignore = source('.gitignore');

for (const expected of [
  'CODEOWNERS',
  'requires a pull request',
  'requires review from Code Owners',
]) {
  requireText('GOVERNANCE.md', governance, expected);
}

for (const expected of ['templates/lesson.mdx', 'GOVERNANCE.md', 'npm run verify']) {
  requireText('CONTRIBUTING.md', contributing, expected);
}

for (const expected of ['CODE_OF_CONDUCT.md', 'GOVERNANCE.md', 'ARCHITECTURE.md']) {
  requireText('README.md', readme, expected);
}

for (const expected of [
  '{{TITLE}}',
  '{{ONE_SENTENCE_DESCRIPTION}}',
  '{{SIDEBAR_POSITION}}',
  '<Difficulty',
  '<Abstract>',
  '<EquationLegend',
  '<JavaCode',
  '<Exercise',
  'decisions/0004',
  ':::warning',
  '## Sources and further reading',
]) {
  requireText('templates/lesson.mdx', lessonTemplate, expected);
}

requireText('package.json', packageJson, '"new:lesson"');
for (const expected of ['templates/lesson.mdx', '--module', '--slug', '--description']) {
  requireText('scripts/scaffold-lesson.mjs', scaffolder, expected);
}
for (const expected of ['Contributor Covenant', 'enforcement']) {
  requireText('CODE_OF_CONDUCT.md', codeOfConduct, expected);
}
for (const expected of ['.claude/', '.agents/', 'CLAUDE.md']) {
  if (!gitignore.includes(expected)) {
    failures.push(`.gitignore must exclude local tooling state: ${expected}`);
  }
}

if (!/^\*\s+@\S+/m.test(codeowners)) {
  failures.push('.github/CODEOWNERS must assign a default owner for all changes');
}
if (!/^\/\.github\/\s+@\S+/m.test(codeowners)) {
  failures.push('.github/CODEOWNERS must protect its own .github directory');
}

for (const expected of ['Proposal', 'Mathematical Review', 'Verification', 'Tool Assistance']) {
  requireText('.github/PULL_REQUEST_TEMPLATE.md', pullRequestTemplate, expected);
}

for (const expected of [
  'Learning objective',
  'Mathematical scope',
  'Primary sources',
  'Acceptance criteria',
]) {
  requireText('.github/ISSUE_TEMPLATE/lesson-proposal.yml', proposalTemplate, expected);
}

for (const expected of [
  'Require review from Code Owners',
  'Require status checks to pass before merging',
  'build',
  'dependency-review',
  'Analyze JavaScript and TypeScript',
]) {
  requireText('.github/MAINTAINER_SETUP.md', maintainerSetup, expected);
}

if (failures.length > 0) {
  console.error('Contributor workflow checks failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(
  'Contributor workflow checks passed: governance, conduct, ownership, and lesson templates.',
);
