const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function backupSqliteIfFile(databaseUrl) {
  if (!databaseUrl) return;
  // handle file URLs like "file:./dev.db" or "sqlite:./dev.db" or direct path
  const match = databaseUrl.match(/(?:file:)?(.*\.db)$/);
  if (!match) return;
  const dbPath = path.resolve(process.cwd(), match[1]);
  if (fs.existsSync(dbPath)) {
    const bakDir = path.join(process.cwd(), 'tmp', 'db-backups');
    fs.mkdirSync(bakDir, { recursive: true });
    const bakPath = path.join(bakDir, `dev-db-backup-${Date.now()}.db`);
    fs.copyFileSync(dbPath, bakPath);
    console.log('SQLite DB backed up to:', bakPath);
  }
}

async function main() {
  try {
    // backup SQLite if used (reads DATABASE_URL from env)
    await backupSqliteIfFile(process.env.DATABASE_URL || '');

    // access Prisma datamodel
    const models = (prisma._dmmf && prisma._dmmf.datamodel && prisma._dmmf.datamodel.models) || [];
    if (!models.length) {
      console.error('No Prisma datamodel available on client.');
      process.exit(1);
    }

    for (const model of models) {
      // find runtime delegate key on prisma client (case-insensitive)
      const delegateKey = Object.keys(prisma).find(k => k.toLowerCase() === model.name.toLowerCase());
      if (!delegateKey || typeof prisma[delegateKey].deleteMany !== 'function') continue;

      // decide filters based on fields present
      const fieldNames = model.fields.map(f => f.name);
      const filters = [];

      if (fieldNames.includes('importedFromExcel')) {
        filters.push({ importedFromExcel: true });
      }
      if (fieldNames.includes('partnerName')) {
        // partnerName contains 'Sample' (case-insensitive)
        filters.push({ partnerName: { contains: 'Sample', mode: 'insensitive' } });
      }
      if (filters.length === 0) continue;

      // build OR query
      const where = { OR: filters };

      try {
        const res = await prisma[delegateKey].deleteMany({ where });
        console.log(`Model ${model.name} -> deleted ${res.count} rows (delegate: ${delegateKey})`);
      } catch (err) {
        console.error(`Model ${model.name} -> deleteMany failed:`, err && err.message ? err.message : err);
      }
    }

    console.log('Cleanup complete.');
  } catch (err) {
    console.error('Cleanup script error:', err && err.message ? err.message : err);
  } finally {
    await prisma.$disconnect();
  }
}

main();