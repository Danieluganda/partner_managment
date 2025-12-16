const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const where = {
      OR: [
        { importedFromExcel: true },
        { partnerName: { contains: 'Sample', mode: 'insensitive' } },
        { partnerName: { contains: 'PEDN', mode: 'insensitive' } } // optional common sample keys
      ]
    };
    const rows = await prisma.partners.findMany({ where, take: 200 });
    console.log(`Found ${rows.length} partner rows matching filters:\n`);
    rows.forEach(r => console.log({ id: r.id, partnerName: r.partnerName, importedFromExcel: r.importedFromExcel }));
  } catch (e) {
    console.error('List failed:', e.message || e);
  } finally {
    await prisma.$disconnect();
  }
}
main();