import {existsSync, readdirSync, statSync} from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const buildDir = path.join(root, 'build');
// Curriculum HTML and the search index grow with every accepted lesson, so the
// total-site budget leaves deliberate content headroom. The tighter assets
// budget catches JavaScript/CSS dependency and simulation bloat separately.
const totalLimitBytes = 24 * 1024 * 1024;
const assetsLimitBytes = 8 * 1024 * 1024;
const individualAssetLimitBytes = 768 * 1024;

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
const assetFiles = files.filter((item) => {
  const relativePath = path.relative(buildDir, item.file);
  return relativePath === 'assets' || relativePath.startsWith(`assets${path.sep}`);
});
const assetTotal = assetFiles.reduce((sum, item) => sum + item.size, 0);
const oversizedAssets = assetFiles.filter((item) => item.size > individualAssetLimitBytes);
const largest = [...files].sort((a, b) => b.size - a.size).slice(0, 15);

console.log(`Total build size: ${fmt(total)}`);
console.log(`Total-site budget: ${fmt(totalLimitBytes)}`);
console.log(`JS/CSS/assets size: ${fmt(assetTotal)}`);
console.log(`Assets budget: ${fmt(assetsLimitBytes)}`);
console.log(`Per-asset budget: ${fmt(individualAssetLimitBytes)}`);
console.log('');
console.log('Largest assets:');
for (const item of largest) {
  console.log(`${fmt(item.size).padStart(10)}  ${path.relative(root, item.file).replaceAll(path.sep, '/')}`);
}

const failures = [];
if (total > totalLimitBytes) {
  failures.push(`build exceeds the total-site budget by ${fmt(total - totalLimitBytes)}`);
}
if (assetTotal > assetsLimitBytes) {
  failures.push(`assets exceed their budget by ${fmt(assetTotal - assetsLimitBytes)}`);
}
for (const item of oversizedAssets) {
  failures.push(
    `${path.relative(root, item.file).replaceAll(path.sep, '/')} exceeds the per-asset budget by ${fmt(item.size - individualAssetLimitBytes)}`,
  );
}

if (failures.length > 0) {
  console.error('\nSize checks failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
