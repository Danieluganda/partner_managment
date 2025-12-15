const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testMasterRegister() {
    try {
        console.log('🔍 Testing Master Register functionality...\n');

        // Test database connection
        console.log('1. Testing database connection...');
        const partnerCount = await prisma.partner.count();
        console.log(`   ✅ Database connected. Found ${partnerCount} partners.\n`);

        // Test getting partners
        console.log('2. Testing Partner retrieval...');
        const partners = await prisma.partner.findMany({
            take: 3,
            orderBy: { createdAt: 'desc' }
        });
        
        console.log(`   ✅ Retrieved ${partners.length} partners:`);
        partners.forEach((partner, index) => {
            console.log(`   ${index + 1}. ${partner.partnerName || 'Unnamed'} (${partner.partnerType || 'Unknown type'})`);
        });
        console.log('');

        // Test Partner model getSummary method
        if (partners.length > 0) {
            console.log('3. Testing Partner model getSummary...');
            
            // Import the Partner model
            const Partner = require('./models/Partner');
            const firstPartner = new Partner(partners[0]);
            const summary = firstPartner.getSummary();
            
            console.log('   ✅ Sample partner summary:');
            console.log('   - ID:', summary.id);
            console.log('   - Name:', summary.partnerName || summary['Partner Name']);
            console.log('   - Status:', summary.status || summary['Contract Status']);
            console.log('   - Type:', summary.partnerType || summary['Partner Type']);
            console.log('   - Value:', summary.contractValue || summary['Contract Value']);
            console.log('');
        }

        // Test external partners
        console.log('4. Testing External Partners...');
        const externalCount = await prisma.externalPartner.count();
        console.log(`   ✅ Found ${externalCount} external partners.\n`);

        // Test financial records
        console.log('5. Testing Financial Records...');
        const financialCount = await prisma.financialRecord.count();
        console.log(`   ✅ Found ${financialCount} financial records.\n`);

        console.log('🎉 All tests passed! Master Register should be working properly.');

    } catch (error) {
        console.error('❌ Test failed:', error);
    } finally {
        await prisma.$disconnect();
    }
}

testMasterRegister();