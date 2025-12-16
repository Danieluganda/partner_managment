const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function hasField(model, name) {
  return model.fields.some(f => f.name === name);
}

async function main() {
  const confirm = process.argv.includes('--yes');
  if (!confirm) {
    console.log('Dry run. To delete re-run with --yes');
  }
  try {
    const models = prisma._dmmf && prisma._dmmf.datamodel && prisma._dmmf.datamodel.models;
    const partnersModel = models && models.find(m => m.name.toLowerCase() === 'partners');
    if (!partnersModel) {
      console.error('Could not find partners model in prisma schema.');
      return;
    }
    const fields = partnersModel.fields.map(f => f.name);
    const OR = [];

    if (hasField(partnersModel, 'importedFromExcel')) OR.push({ importedFromExcel: true });
    if (fields.includes('partnerName')) {
      const patterns = ['Sample', 'Test', 'Example', 'PEDN', 'SBIL'];
      patterns.forEach(p => OR.push({ partnerName: { contains: p, mode: 'insensitive' } }));
    }
    if (fields.some(f => /email/i.test(f))) {
      const emailFields = fields.filter(f => /email/i.test(f));
      emailFields.forEach(f => OR.push({ [f]: { contains: 'example', mode: 'insensitive' } }));
    }

    if (OR.length === 0) {
      console.log('No candidate filters available for partners model based on schema.');
      return;
    }

    const where = { OR };
    const count = await prisma.partners.count({ where });
    console.log(`Candidates matched: ${count}`);
    if (!confirm) return;

    const res = await prisma.partners.deleteMany({ where });
    console.log(`Deleted ${res.count} partner rows.`);
  } catch (e) {
    console.error('Delete failed:', e && e.message ? e.message : e);
  } finally {
    await prisma.$disconnect();
  }
}

main();