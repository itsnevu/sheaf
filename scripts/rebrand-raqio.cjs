const fs = require('node:fs');
const path = require('node:path');
const root = process.cwd();
const skip = new Set(['.git', 'node_modules', '.agents', '.codex', '.claude', '.aws', '.firecrawl', 'out', 'cache', 'lib', 'coverage', 'test-results', 'playwright-report', 'qa-shots']);
const extensions = new Set(['.ts', '.tsx', '.js', '.jsx', '.cjs', '.mjs', '.json', '.md', '.txt', '.css', '.html', '.svg', '.sol', '.toml', '.yml', '.yaml', '.sh', '.ps1', '.example', '.lock']);
const files = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isSymbolicLink()) continue;
    const target = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!skip.has(entry.name) && !entry.name.startsWith('.next')) walk(target);
    } else if (target !== __filename && (extensions.has(path.extname(entry.name)) || ['Dockerfile', '.gitignore', '.dockerignore', '.env', '.env.local', '.env.production'].includes(entry.name))) files.push(target);
  }
}
// src/lib is application code, while contracts/lib contains vendored dependencies.
skip.delete('lib');
const originalWalk = walk;
// Traverse project directories; skip vendor trees explicitly below.
walk = function(dir) {
  if (/contracts[\\/]lib(?:[\\/]|$)/.test(dir)) return;
  return originalWalk(dir);
};
walk(root);
function rename(text) {
  return text.replace(/rheo/gi, value => value === value.toUpperCase() ? 'RAQIO' : value === value.toLowerCase() ? 'raqio' : 'Raqio');
}
let changed = 0;
for (const file of files) {
  const before = fs.readFileSync(file, 'utf8');
  if (before.includes('\0')) continue;
  let after;
  if (/^\.env(?:\.(?:local|production))?$/.test(path.basename(file))) {
    // Rename environment keys only; never rewrite secret values.
    after = before.replace(/^(\s*(?:export\s+)?)([A-Za-z_][A-Za-z0-9_]*)(\s*=)/gm, (_, prefix, key, equals) => prefix + rename(key) + equals);
  } else {
    after = rename(before);
    // The physical workspace has not moved; retain valid absolute local paths.
    after = after.replaceAll(root.replaceAll('RHEO', 'RAQIO'), root);
    after = after.replaceAll(root.replaceAll('\\', '/').replaceAll('RHEO', 'RAQIO'), root.replaceAll('\\', '/'));
    after = after.replaceAll(root.replaceAll('\\', '\\\\').replaceAll('RHEO', 'RAQIO'), root.replaceAll('\\', '\\\\'));
  }
  if (after !== before) { fs.writeFileSync(file, after); changed++; }
}
let renamed = 0;
for (const file of files) {
  const name = path.basename(file);
  if (/rheo/i.test(name)) {
    const destination = path.join(path.dirname(file), rename(name));
    if (fs.existsSync(destination)) throw new Error('Rename destination exists: ' + destination);
    fs.renameSync(file, destination); renamed++;
  }
}
console.log(JSON.stringify({ changedFiles: changed, renamedFiles: renamed }));
