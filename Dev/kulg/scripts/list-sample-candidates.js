const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function hasField(model, name) {
  return model.fields.some(f => f.name === name);
}

async function main() {
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
    if (fields.includes('contactEmail') || fields.includes('email') || fields.includes('contactEmailAddress')) {
      const emailFields = fields.filter(f => /email/i.test(f));
      emailFields.forEach(f => OR.push({ [f]: { contains: 'example', mode: 'insensitive' } }));
    }

    if (OR.length === 0) {
      console.log('No candidate filters available for partners model based on schema.');
      return;
    }

    const where = { OR };
    const rows = await prisma.partners.findMany({ where, take: 200, select: { id: true, partnerName: true, contactEmail: true, importedFromExcel: true } });
    console.log(`Found ${rows.length} candidate partner rows (showing up to 200):`);
    rows.forEach(r => console.log(r));
  } catch (e) {
    console.error('List failed:', e && e.message ? e.message : e);
  } finally {
    await prisma.$disconnect();
  }
}

main();