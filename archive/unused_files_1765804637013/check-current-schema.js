const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkSchema() {
  try {
    console.log('🔍 Checking current database schema...');
    
    // Get a sample user to see what fields exist
    const sampleUser = await prisma.user.findFirst();
    
    if (sampleUser) {
      console.log('📊 Current user fields:');
      console.log(Object.keys(sampleUser));
      console.log('\n📋 Sample user data:');
      console.log(sampleUser);
    } else {
      console.log('❌ No users found in database');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkSchema();