const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testConnection() {
  try {
    console.log('🔍 Testing database connection...');
    
    // Test all main tables
    const [users, partners, externalPartners, personnel, deliverables] = await Promise.all([
      prisma.users.count(),
      prisma.partners.count(),
      prisma.external_partners.count(),
      prisma.personnel.count(),
      prisma.deliverables.count()
    ]);

    console.log('✅ Database connection successful!');
    console.log(`👥 Users: ${users}`);
    console.log(`🤝 Partners: ${partners}`);
    console.log(`🌐 External Partners: ${externalPartners}`);
    console.log(`👨‍💼 Personnel: ${personnel}`);
    console.log(`📋 Deliverables: ${deliverables}`);

    // Test a sample user query
    const sampleUser = await prisma.users.findFirst();
    if (sampleUser) {
      console.log(`✅ Sample user found: ${sampleUser.username} (${sampleUser.email})`);
    }

  } catch (error) {
    console.error('❌ Database connection failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();