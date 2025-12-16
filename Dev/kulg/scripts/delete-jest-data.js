require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const MATCH = process.env.JEST_DATA_MATCH || 'Jest';
const args = process.argv.slice(2);
const confirm = args.includes('--yes');

async function listModelDelegates() {
  return Object.keys(prisma).filter(k => prisma[k] && typeof prisma[k].findFirst === 'function');
}

function stringLikeConditionsForSample(sample, match) {
  const conditions = [];
  for (const k of Object.keys(sample || {})) {
    const v = sample[k];
    if (typeof v === 'string') {
      conditions.push({ [k]: { contains: match } });
    }
  }
  return conditions;
}

(async () => {
  try {
    const models = await listModelDelegates();
    const summary = [];

    for (const m of models) {
      try {
        const sample = await prisma[m].findFirst();
        if (!sample) { summary.push({ model: m, sampleKeys: [], matches: 0 }); continue; }
        const conds = stringLikeConditionsForSample(sample, MATCH);
        if (conds.length === 0) { summary.push({ model: m, sampleKeys: Object.keys(sample).slice(0,10), matches: 0 }); continue; }

        // try query
        let found = [];
        try {
          found = await prisma[m].findMany({ where: { OR: conds }, select: { id: true } });
        } catch (qerr) {
          // query failed (maybe filter not supported) — skip
          summary.push({ model: m, sampleKeys: Object.keys(sample).slice(0,10), matches: 'query-failed' });
          continue;
        }

        summary.push({ model: m, sampleKeys: Object.keys(sample).slice(0,10), matches: found.length, sampleIds: found.slice(0,10).map(x => x.id) });
      } catch (err) {
        summary.push({ model: m, error: err && err.message ? err.message : String(err) });
      }
    }

    console.table(summary.map(s => ({ model: s.model, matches: s.matches, sampleKeys: (s.sampleKeys||[]).slice(0,6).join(', ')})));

    // If nothing to delete, exit
    const totalMatches = summary.reduce((acc, s) => acc + (typeof s.matches === 'number' ? s.matches : 0), 0);
    console.log(`Total estimated matches: ${totalMatches}`);

    if (totalMatches === 0) {
      await prisma.$disconnect();
      process.exit(0);
    }

    if (!confirm) {
      console.log('');
      console.log('Dry run complete. To delete matching records re-run with:');
      console.log('  node .\\scripts\\delete-jest-data.js --yes');
      await prisma.$disconnect();
      process.exit(0);
    }

    // perform deletes per model (rebuild conditions then deleteMany)
    for (const s of summary) {
      if (typeof s.matches !== 'number' || s.matches === 0) continue;
      try {
        const sample = await prisma[s.model].findFirst();
        const conds = stringLikeConditionsForSample(sample, MATCH);
        if (conds.length === 0) continue;
        const res = await prisma[s.model].deleteMany({ where: { OR: conds } });
        console.log(`Deleted ${res.count} records from ${s.model}`);
      } catch (delErr) {
        console.warn(`Failed to delete from ${s.model}:`, delErr && delErr.message ? delErr.message : delErr);
      }
    }

    console.log('Deletion pass complete.');
  } catch (err) {
    console.error('Script failed:', err && err.message ? err.message : err);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
})();