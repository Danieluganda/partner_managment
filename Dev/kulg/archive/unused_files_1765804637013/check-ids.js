const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function showPartnerIds() {
    try {
        console.log('🔍 Partner IDs in database:');
        
        const partners = await prisma.partner.findMany({
            select: {
                id: true,
                partnerName: true,
                partnerType: true
            },
            orderBy: { createdAt: 'desc' }
        });
        
        partners.forEach((partner, index) => {
            console.log(`${index + 1}. ID: ${partner.id}`);
            console.log(`   Name: ${partner.partnerName || 'Unnamed'}`);
            console.log(`   Type: ${partner.partnerType || 'Unknown'}`);
            console.log('');
        });
        
        console.log(`Total: ${partners.length} partners`);
        
        if (partners.length > 0) {
            const firstId = partners[0].id;
            console.log(`\n🔗 Test edit URL: http://localhost:3000/forms/partner/${firstId}/edit`);
        }
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

showPartnerIds();