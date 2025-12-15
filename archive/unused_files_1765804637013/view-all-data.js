const { PrismaClient } = require('@prisma/client');

async function viewAllData() {
    const prisma = new PrismaClient();
    
    try {
        console.log('📋 Complete Database Contents');
        console.log('=' .repeat(60));
        
        // All Partners
        console.log('\n👥 ALL PARTNERS:');
        const partners = await prisma.partner.findMany({
            orderBy: { createdAt: 'desc' }
        });
        
        partners.forEach((partner, index) => {
            console.log(`\n${index + 1}. ${partner.partnerName} (ID: ${partner.id})`);
            console.log(`   Type: ${partner.partnerType}`);
            console.log(`   Email: ${partner.contactEmail}`);
            console.log(`   Phone: ${partner.contactPhone || 'N/A'}`);
            console.log(`   Status: ${partner.contractStatus || 'N/A'}`);
            console.log(`   Value: ${partner.contractValue || 'N/A'}`);
            console.log(`   Start: ${partner.contractStartDate || 'N/A'}`);
            console.log(`   End: ${partner.contractEndDate || 'N/A'}`);
            console.log(`   Created: ${partner.createdAt}`);
        });
        
        // All External Partners
        console.log('\n\n🤝 ALL EXTERNAL PARTNERS:');
        const externalPartners = await prisma.externalPartner.findMany({
            orderBy: { createdAt: 'desc' }
        });
        
        externalPartners.forEach((partner, index) => {
            console.log(`\n${index + 1}. ${partner.partnerName} (ID: ${partner.id})`);
            console.log(`   Type: ${partner.partnerType}`);
            console.log(`   Contact: ${partner.keyContact}`);
            console.log(`   Email: ${partner.contactEmail}`);
            console.log(`   Phone: ${partner.contactPhone || 'N/A'}`);
            console.log(`   Stage: ${partner.currentStage}`);
            console.log(`   Status: ${partner.status}`);
            console.log(`   Objectives: ${partner.keyObjectives}`);
            console.log(`   Responsible: ${partner.responsible}`);
            console.log(`   Value: ${partner.estimatedValue || 'N/A'}`);
            console.log(`   Priority: ${partner.priority || 'N/A'}`);
            console.log(`   Created: ${partner.createdAt}`);
        });
        
    } catch (error) {
        console.error('❌ Error viewing data:', error);
    } finally {
        await prisma.$disconnect();
    }
}

viewAllData();