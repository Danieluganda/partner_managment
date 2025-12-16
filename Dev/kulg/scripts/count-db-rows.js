const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    const partners = await prisma.partners.count();
    const deliverables = await prisma.deliverables.count();
    const personnel = await prisma.personnel.count();
    console.log({ partners, deliverables, personnel });
  } catch (e) {
    console.error('Count failed:', e.message || e);
  } finally {
    await prisma.$disconnect();
  }
})();