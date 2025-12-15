require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const DIR = path.join(process.cwd(), 'data', 'excel');
const STATE_FILE = path.join(DIR, '.imported.json');

const MODELS = [
  'deliverables',
  'partners',
  'personnel',
  'personnels',
  'compliance',
  'complianceRecords',
  'financials',
  'keyPersonnel',
  'masterRegister'
];

function parseArgs() {
  const args = process.argv.slice(2);
  return {
    yes: args.includes('--yes') || process.env.CONFIRM_CLEAN === 'yes',
    moveExcel: args.includes('--move-excel'),
    backupDir: args.includes('--backup-dir') ? args[args.indexOf('--backup-dir') + 1] : null
  };
}

async function deleteModel(model) {
  try {
    if (!prisma[model]) {
      console.log(`Skipping ${model} — model not present on Prisma client`);
      return { model, skipped: true };
    }
    const res = await prisma[model].deleteMany({});
    console.log(`Deleted ${res.count} rows from ${model}`);
    return { model, deleted: res.count };
  } catch (err) {
    console.warn(`Error deleting ${model}:`, err.message || err);
    return { model, error: err.message || String(err) };
  }
}

(async () => {
  const opts = parseArgs();
  if (!opts.yes) {
    console.log('Aborting: pass --yes or set CONFIRM_CLEAN=yes to proceed.');
    process.exit(1);
  }

  try {
    console.log('Starting dashboard data cleanup — connecting to database...');
    // optional: list counts before deleting
    for (const m of MODELS) {
      try {
        if (prisma[m] && typeof prisma[m].count === 'function') {
          const c = await prisma[m].count();
          console.log(`Count for ${m}: ${c}`);
        }
      } catch (_) {}
    }

    // delete each model safely
    for (const m of MODELS) {
      await deleteModel(m);
    }

    // remove .imported.json to avoid re-import
    try {
      if (fs.existsSync(STATE_FILE)) {
        fs.unlinkSync(STATE_FILE);
        console.log(`Removed state file: ${STATE_FILE}`);
      } else {
        console.log(`No state file found at ${STATE_FILE}`);
      }
    } catch (err) {
      console.warn('Failed to remove .imported.json:', err.message || err);
    }

    // optionally move Excel files to backup folder
    if (opts.moveExcel) {
      const backupRoot = opts.backupDir || path.join(process.cwd(), 'data', 'excel_backup_' + Date.now());
      if (!fs.existsSync(backupRoot)) fs.mkdirSync(backupRoot, { recursive: true });
      const files = fs.readdirSync(DIR).filter(f => f !== path.basename(STATE_FILE));
      for (const f of files) {
        const src = path.join(DIR, f);
        const dst = path.join(backupRoot, f);
        try { fs.renameSync(src, dst); console.log(`Moved ${f} -> ${backupRoot}`); }
        catch (e) { console.warn(`Failed to move ${f}:`, e.message || e); }
      }
      console.log('Excel files moved to:', backupRoot);
    }

    console.log('Cleanup complete.');
  } catch (err) {
    console.error('Cleanup failed:', err && err.message ? err.message : err);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
})();