const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkActualSchema() {
  try {
    console.log('🔍 Checking actual database structure...');
    
    // Get a sample user to see the actual structure
    const user = await prisma.$queryRaw`SELECT * FROM users LIMIT 1`;
    
    if (user && user.length > 0) {
      console.log('📊 Actual user fields in database:');
      console.log(Object.keys(user[0]));
      console.log('\n📋 Sample data:');
      console.log(user[0]);
    } else {
      console.log('❌ No users found');
    }
    
    // Check the role values in the database
    const roles = await prisma.$queryRaw`SELECT DISTINCT role FROM users`;
    console.log('\n👑 Actual role values in database:');
    console.log(roles.map(r => r.role));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkActualSchema();