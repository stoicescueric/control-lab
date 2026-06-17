import {existsSync, readdirSync, statSync} from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const buildDir = path.join(root, 'build');
const limitBytes = 16 * 1024 * 1024;

function walk(dir) {
  return readdirSync(dir, {withFileTypes: true}).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

function fmt(bytes) {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

if (!existsSync(buildDir)) {
  console.error('No build/ directory found. Run `npm run build` first.');
  process.exit(1);
}

const files = walk(buildDir).map((file) => ({file, size: statSync(file).size}));
const total = files.reduce((sum, item) => sum + item.size, 0);
const largest = [...files].sort((a, b) => b.size - a.size).slice(0, 15);

console.log(`Total build size: ${fmt(total)}`);
console.log(`Budget: ${fmt(limitBytes)}`);
console.log('');
console.log('Largest assets:');
for (const item of largest) {
  console.log(`${fmt(item.size).padStart(10)}  ${path.relative(root, item.file).replaceAll(path.sep, '/')}`);
}

if (total > limitBytes) {
  console.error(`\nBuild exceeds size budget by ${fmt(total - limitBytes)}.`);
  process.exit(1);
}
