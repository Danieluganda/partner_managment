/**
 * Move unused files from a target directory into an archive folder.
 * Dry-run by default. Use --yes to perform moves.
 *
 * Usage:
 *  node .\scripts\move-unused-files.js                     # dry-run for cwd
 *  node .\scripts\move-unused-files.js --dir C:\path\to\target --yes
 *  node .\scripts\move-unused-files.js --dir data\excel --recursive --yes
 *  node .\scripts\move-unused-files.js --keep "file1,file2" --yes
 *  node .\scripts\move-unused-files.js --archive-dir ./arch --yes
 */
const fs = require('fs');
const path = require('path');

const cwd = process.cwd();
const args = process.argv.slice(2);
const confirm = args.includes('--yes');

const dirArgIndex = args.indexOf('--dir');
const targetDir = dirArgIndex !== -1 && args[dirArgIndex + 1]
  ? path.resolve(cwd, args[dirArgIndex + 1])
  : cwd;

const archiveArgIndex = args.indexOf('--archive-dir');
const archiveRootBase = archiveArgIndex !== -1 && args[archiveArgIndex + 1]
  ? path.resolve(cwd, args[archiveArgIndex + 1])
  : path.join(targetDir, 'archive');

const recursive = args.includes('--recursive');

const keepArgIndex = args.indexOf('--keep');
const keepList = keepArgIndex !== -1 && args[keepArgIndex + 1]
  ? args[keepArgIndex + 1].split(',').map(s => s.trim()).filter(Boolean)
  : [];

const defaultKeep = [
  '.env', 'package.json', 'package-lock.json', 'README.md', 'app.js',
  'prisma.config.ts', 'jest.config.js', '.gitignore', 'NODE_README.md'
];

const keepSet = new Set([...defaultKeep, ...keepList]);

// directories to ignore while recursing
const ignoreDirs = new Set([
  '.git', 'node_modules', 'prisma', 'data', 'scripts', 'services', 'tests', 'coverage', '.vscode', 'public', 'views'
]);

function listTopLevelFiles(dir) {
  const items = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const it of items) {
    if (it.isFile()) {
      const name = it.name;
      if (!keepSet.has(name)) files.push(path.join(dir, name));
    }
  }
  return files;
}

function walkAndCollect(dir) {
  const result = [];
  const items = fs.readdirSync(dir, { withFileTypes: true });
  for (const it of items) {
    const name = it.name;
    const full = path.join(dir, name);
    if (it.isDirectory()) {
      if (ignoreDirs.has(name)) continue;
      result.push(...walkAndCollect(full));
    } else if (it.isFile()) {
      // skip if filename in keepSet (only basename)
      if (!keepSet.has(name)) result.push(full);
    }
  }
  return result;
}

(function main() {
  if (!fs.existsSync(targetDir) || !fs.statSync(targetDir).isDirectory()) {
    console.error('Target directory does not exist or is not a directory:', targetDir);
    process.exit(1);
  }

  const candidates = recursive ? walkAndCollect(targetDir) : listTopLevelFiles(targetDir);

  if (candidates.length === 0) {
    console.log('No candidate files found to move in', targetDir);
    process.exit(0);
  }

  console.log(`Target directory: ${targetDir}`);
  console.log('Candidate files to move:');
  candidates.forEach(n => console.log('  ', path.relative(targetDir, n)));
  console.log('');
  console.log('Files in keep list (will NOT be moved):', Array.from(keepSet).join(', '));
  console.log('');

  if (!confirm) {
    console.log('Dry run only. Re-run with --yes to move these files into:', path.join(archiveRootBase, `unused_files_${Date.now()}`));
    process.exit(0);
  }

  const archiveDir = path.join(archiveRootBase, `unused_files_${Date.now()}`);
  fs.mkdirSync(archiveDir, { recursive: true });

  for (const src of candidates) {
    try {
      const rel = path.relative(targetDir, src);
      const dst = path.join(archiveDir, rel);
      const dstDir = path.dirname(dst);
      fs.mkdirSync(dstDir, { recursive: true });
      fs.renameSync(src, dst);
      console.log(`Moved: ${rel} -> ${path.relative(process.cwd(), dst)}`);
    } catch (err) {
      console.warn(`Failed to move ${src}:`, err && err.message ? err.message : err);
    }
  }

  console.log('');
  console.log('Move complete. Archive folder:', archiveDir);
})();