const { PrismaClient } = require('@prisma/client');

async function inspectDatabase() {
    const prisma = new PrismaClient();
    
    try {
        console.log('🔍 Database Inspection Report');
        console.log('=' .repeat(50));
        
        // Count records in each table
        const partnerCount = await prisma.partner.count();
        const externalPartnerCount = await prisma.externalPartner.count();
        const financialCount = await prisma.financialRecord.count();
        const personnelCount = await prisma.personnel.count();
        const deliverableCount = await prisma.deliverable.count();
        const complianceCount = await prisma.complianceRecord.count();
        const userCount = await prisma.user.count();
        const activityLogCount = await prisma.activityLog.count();
        
        console.log('\n📊 Record Counts:');
        console.log(`Partners: ${partnerCount}`);
        console.log(`External Partners: ${externalPartnerCount}`);
        console.log(`Financial Records: ${financialCount}`);
        console.log(`Personnel Records: ${personnelCount}`);
        console.log(`Deliverables: ${deliverableCount}`);
        console.log(`Compliance Records: ${complianceCount}`);
        console.log(`Users: ${userCount}`);
        console.log(`Activity Logs: ${activityLogCount}`);
        
        // Show sample partners
        if (partnerCount > 0) {
            console.log('\n👥 Sample Partners:');
            const partners = await prisma.partner.findMany({
                take: 5,
                select: {
                    id: true,
                    partnerName: true,
                    partnerType: true,
                    contactEmail: true,
                    contractStatus: true,
                    createdAt: true
                }
            });
            console.table(partners);
        }
        
        // Show sample external partners
        if (externalPartnerCount > 0) {
            console.log('\n🤝 Sample External Partners:');
            const externalPartners = await prisma.externalPartner.findMany({
                take: 5,
                select: {
                    id: true,
                    partnerName: true,
                    partnerType: true,
                    contactEmail: true,
                    status: true,
                    createdAt: true
                }
            });
            console.table(externalPartners);
        }
        
        // Show sample financial records
        if (financialCount > 0) {
            console.log('\n💰 Sample Financial Records:');
            const financial = await prisma.financialRecord.findMany({
                take: 5,
                select: {
                    id: true,
                    partnerId: true,
                    contractValue: true,
                    budgetAllocated: true,
                    actualSpent: true,
                    financialStatus: true,
                    createdAt: true
                }
            });
            console.table(financial);
        }
        
        console.log('\n✅ Database inspection complete!');
        
    } catch (error) {
        console.error('❌ Error inspecting database:', error);
    } finally {
        await prisma.$disconnect();
    }
}

inspectDatabase();