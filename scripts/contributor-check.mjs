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

const agents = source('AGENTS.md');
const aiWorkflow = source('AI_WORKFLOW.md');
const governance = source('GOVERNANCE.md');
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
  'CONTRIBUTING.md',
  'ARCHITECTURE.md',
  'docs/notation.mdx',
  'templates/lesson.mdx',
  'npm run verify',
  'maintainer',
]) {
  requireText('AGENTS.md', agents, expected);
}

for (const expected of ['AGENTS.md', 'Pass 1', 'Pass 2', 'Pass 3', 'Human Review Checklist']) {
  requireText('AI_WORKFLOW.md', aiWorkflow, expected);
}

for (const expected of ['CODEOWNERS', 'requires a pull request', 'requires review from Code Owners']) {
  requireText('GOVERNANCE.md', governance, expected);
}

for (const expected of ['AI_WORKFLOW.md', 'templates/lesson.mdx', 'GOVERNANCE.md']) {
  requireText('CONTRIBUTING.md', contributing, expected);
}

for (const expected of ['AGENTS.md', 'AI_WORKFLOW.md', 'GOVERNANCE.md']) {
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
  ':::warning',
  '## Sources and further reading',
]) {
  requireText('templates/lesson.mdx', lessonTemplate, expected);
}

requireText('package.json', packageJson, '"new:lesson"');
for (const expected of ['templates/lesson.mdx', '--module', '--slug', '--description']) {
  requireText('scripts/scaffold-lesson.mjs', scaffolder, expected);
}
if (/^AGENTS\.md\s*$/m.test(gitignore)) {
  failures.push('.gitignore must not exclude the public AGENTS.md guide');
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

for (const expected of ['Learning objective', 'Mathematical scope', 'Primary sources', 'Acceptance criteria']) {
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
  'Contributor workflow checks passed: governance, AI guidance, ownership, and lesson templates.',
);
