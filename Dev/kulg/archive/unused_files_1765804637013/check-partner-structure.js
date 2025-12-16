const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkPartnerStructure() {
    try {
        const partner = await prisma.partner.findFirst();
        console.log('First partner structure:', JSON.stringify(partner, null, 2));
        
        const externalPartner = await prisma.externalPartner.findFirst();
        console.log('First external partner structure:', JSON.stringify(externalPartner, null, 2));
        
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkPartnerStructure();