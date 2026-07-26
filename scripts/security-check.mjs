import {existsSync, readFileSync, readdirSync} from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const failures = [];

function walk(dir, predicate = () => true) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, {withFileTypes: true}).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full, predicate) : predicate(full) ? [full] : [];
  });
}

function fail(message) {
  failures.push(message);
}

for (const workflow of walk(path.join(root, '.github'), (file) => /\.ya?ml$/.test(file))) {
  const source = readFileSync(workflow, 'utf8');
  for (const match of source.matchAll(/^\s*(?:-\s+)?uses:\s+[^@\s]+@([^\s#]+)/gm)) {
    if (!/^[0-9a-f]{40}$/.test(match[1])) {
      fail(`${path.relative(root, workflow)} uses a mutable action ref: ${match[0].trim()}`);
    }
  }
  if (/\bpull_request_target\s*:/.test(source)) {
    fail(`${path.relative(root, workflow)} uses pull_request_target`);
  }
}

const lockfile = JSON.parse(readFileSync(path.join(root, 'package-lock.json'), 'utf8'));
for (const [name, entry] of Object.entries(lockfile.packages ?? {})) {
  if (!entry.resolved) continue;
  let resolved;
  try {
    resolved = new URL(entry.resolved);
  } catch {
    fail(`package-lock.json has an invalid resolved URL for ${name}`);
    continue;
  }
  if (resolved.protocol !== 'https:' || resolved.hostname !== 'registry.npmjs.org') {
    fail(`package-lock.json resolves ${name} from untrusted origin ${resolved.origin}`);
  }
  if (!entry.integrity) {
    fail(`package-lock.json is missing integrity for ${name}`);
  }
}

const buildDir = path.join(root, 'build');
if (!existsSync(buildDir)) {
  fail('build/ is missing; run npm run build before npm run security');
} else {
  const indexHtml = readFileSync(path.join(buildDir, 'index.html'), 'utf8');
  if (
    !/<meta\b(?=[^>]*http-equiv=(?:["']Content-Security-Policy["']|Content-Security-Policy))(?=[^>]*content=)[^>]*>/i.test(
      indexHtml,
    )
  ) {
    fail('production build is missing its meta Content Security Policy');
  }

  const sourceMaps = walk(buildDir, (file) => file.endsWith('.map'));
  if (sourceMaps.length > 0) {
    fail(`production build contains ${sourceMaps.length} source map(s)`);
  }

  for (const htmlFile of walk(buildDir, (file) => file.endsWith('.html'))) {
    const html = readFileSync(htmlFile, 'utf8');
    const relative = path.relative(root, htmlFile);
    if (/<script\b[^>]*\bsrc=["']https?:\/\//i.test(html)) {
      fail(`${relative} loads a third-party script before consent`);
    }
    if (/<iframe\b[^>]*\bsrc=["']https?:\/\//i.test(html)) {
      fail(`${relative} loads a third-party iframe before interaction`);
    }
    if (
      /<link\b(?=[^>]*\brel=["']stylesheet["'])(?=[^>]*\bhref=["']https?:\/\/)[^>]*>/i.test(
        html,
      )
    ) {
      fail(`${relative} loads a third-party stylesheet`);
    }
  }
}

for (const sourceFile of walk(path.join(root, 'src'), (file) =>
  /\.(?:js|jsx|ts|tsx)$/.test(file),
)) {
  const source = readFileSync(sourceFile, 'utf8');
  if (source.includes('dangerouslySetInnerHTML')) {
    fail(`${path.relative(root, sourceFile)} uses dangerouslySetInnerHTML`);
  }
  if (/\.innerHTML\s*=|\bdocument\.write\s*\(/.test(source)) {
    fail(`${path.relative(root, sourceFile)} uses an HTML parser sink`);
  }
  if (/\beval\s*\(|\bnew\s+Function\s*\(/.test(source)) {
    fail(`${path.relative(root, sourceFile)} uses dynamic code execution`);
  }
}

if (failures.length > 0) {
  console.error('Security checks failed:');
  for (const message of failures) console.error(`- ${message}`);
  process.exit(1);
}

console.log('Security checks passed: immutable Actions, trusted lockfile, safe static output.');
