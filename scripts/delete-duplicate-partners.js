require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const NAME = process.env.TARGET_PARTNER_NAME || 'Jest Test Partner';
const args = process.argv.slice(2);
const confirm = args.includes('--yes');
const specifiedModel = (() => {
  const i = args.indexOf('--model');
  return i !== -1 ? args[i + 1] : null;
})();

async function listModels() {
  const keys = Object.keys(prisma).filter(k => typeof prisma[k] === 'object' && typeof prisma[k].findMany === 'function');
  console.log('Prisma model delegates (candidate list):', keys.join(', '));
  for (const k of keys) {
    try {
      const count = typeof prisma[k].count === 'function' ? await prisma[k].count() : 'n/a';
      const sample = typeof prisma[k].findFirst === 'function' ? await prisma[k].findFirst() : null;
      console.log(`\nModel: ${k}\n  count: ${count}\n  sample keys: ${sample ? Object.keys(sample).slice(0,12).join(', ') : 'no sample or empty'}`);
      if (sample) console.log('  sample preview:', Object.fromEntries(Object.entries(sample).slice(0,6)));
    } catch (err) {
      console.log(`\nModel: ${k} — error retrieving info: ${err && err.message ? err.message : err}`);
    }
  }
  console.log('\nTo delete run: node .\\scripts\\delete-duplicate-partners.js --model <modelName> --yes');
  await prisma.$disconnect();
  process.exit(0);
}

async function deleteByModel(model) {
  if (!prisma[model] || typeof prisma[model].findMany !== 'function') {
    console.error(`Model "${model}" not found or not queryable on Prisma client.`);
    await prisma.$disconnect();
    process.exit(1);
  }

  console.log(`Target model: ${model}  — searching for records where partnerName="${NAME}"`);
  let found = [];
  try {
    found = await prisma[model].findMany({ where: { partnerName: NAME }, select: { id: true } });
  } catch (err) {
    console.error('Query by partnerName failed (field may not exist on model). Error:', err.message || err);
    console.error('Open Prisma Studio (npx prisma studio) to inspect the correct model/field names, or rerun script without --model to list models.');
    await prisma.$disconnect();
    process.exit(1);
  }

  console.log(`Found ${found.length} records matching partnerName="${NAME}". Sample ids:`, found.slice(0,10).map(x => x.id));
  if (found.length === 0) {
    await prisma.$disconnect();
    process.exit(0);
  }

  if (!confirm) {
    console.log('Dry run. Re-run with --yes to perform deletion.');
    await prisma.$disconnect();
    process.exit(0);
  }

  try {
    const res = await prisma[model].deleteMany({ where: { partnerName: NAME } });
    console.log(`Deleted ${res.count} records from ${model}`);
  } catch (err) {
    console.error('Deletion failed:', err.message || err);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
}

(async () => {
  if (!specifiedModel) {
    await listModels();
    return;
  }
  await deleteByModel(specifiedModel);
})();