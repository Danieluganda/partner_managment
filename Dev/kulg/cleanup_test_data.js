require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function cleanupTestData() {
    console.log('🧹 Starting test data cleanup...\n');
    
    try {
        // Delete test compliance records
        const deletedCompliance = await prisma.compliance_records.deleteMany({
            where: {
                OR: [
                    { partnerName: { contains: 'Test' } },
                    { partnerName: { contains: 'test' } },
                    { requirement: { contains: 'Annual Tax Filing' } } // from debug script
                ]
            }
        });
        console.log(`✅ Deleted ${deletedCompliance.count} test compliance records`);

        // Delete test deliverables
        const deletedDeliverables = await prisma.deliverables.deleteMany({
            where: {
                OR: [
                    { partnerName: { contains: 'Test' } },
                    { partnerName: { contains: 'test' } },
                    { description: { contains: 'Inception Report' } } // from debug script
                ]
            }
        });
        console.log(`✅ Deleted ${deletedDeliverables.count} test deliverable records`);

        // Delete test personnel
        const deletedPersonnel = await prisma.personnel.deleteMany({
            where: {
                OR: [
                    { partnerName: { contains: 'Test' } },
                    { partnerName: { contains: 'test' } }
                ]
            }
        });
        console.log(`✅ Deleted ${deletedPersonnel.count} test personnel records`);

        // Delete test partners
        const deletedPartners = await prisma.partners.deleteMany({
            where: {
                OR: [
                    { partnerName: { contains: 'Test' } },
                    { partnerName: { contains: 'test' } }
                ]
            }
        });
        console.log(`✅ Deleted ${deletedPartners.count} test partner records`);

        console.log('\n✨ Cleanup complete!');
        
        // Show remaining counts
        const remainingCompliance = await prisma.compliance_records.count();
        const remainingDeliverables = await prisma.deliverables.count();
        const remainingPersonnel = await prisma.personnel.count();
        const remainingPartners = await prisma.partners.count();
        
        console.log('\n📊 Remaining records:');
        console.log(`   Compliance: ${remainingCompliance}`);
        console.log(`   Deliverables: ${remainingDeliverables}`);
        console.log(`   Personnel: ${remainingPersonnel}`);
        console.log(`   Partners: ${remainingPartners}`);
        
    } catch (error) {
        console.error('❌ Error during cleanup:', error);
    } finally {
        await prisma.$disconnect();
    }
}

cleanupTestData();
